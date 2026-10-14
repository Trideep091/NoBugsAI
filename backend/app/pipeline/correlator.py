"""Incident Correlation and Relationship Discovery Engine (Milestone 4)"""
import datetime
from typing import List, Dict, Any, Tuple
from collections import defaultdict


class IncidentCorrelator:
    """
    Groups correlated log events into coherent incidents and determines
    cause-and-symptom relationships between events.
    """

    def __init__(self, time_window_seconds: int = 120):
        self.time_window = datetime.timedelta(seconds=time_window_seconds)

    def correlate_events(
        self,
        events: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Groups error events into incidents based on:
        1. Shared trace_id / request_id
        2. Exact signature fingerprint match
        3. Cascading failure chains within time windows (e.g. DB timeout -> API 504)
        
        Returns:
            Tuple of:
            - list of incident draft dicts
            - list of incident relationship dicts
        """
        error_events = [e for e in events if e.get("is_error")]
        if not error_events:
            return [], []

        # Sort chronologically
        def get_ts(e):
            t = e.get("timestamp")
            if t is None:
                return datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
            if t.tzinfo is None:
                return t.replace(tzinfo=datetime.timezone.utc)
            return t

        error_events.sort(key=get_ts)

        # 1. Group by trace_id if present
        trace_groups = defaultdict(list)
        untraced_events = []

        for e in error_events:
            tr_id = e.get("trace_id") or e.get("request_id")
            if tr_id:
                trace_groups[tr_id].append(e)
            else:
                untraced_events.append(e)

        # 2. Group untraced events by (component + signature + time window)
        signature_groups = []
        for e in untraced_events:
            placed = False
            e_ts = get_ts(e)
            e_sig = e.get("signature")
            e_type = e.get("error_type")
            e_comp = e.get("component")

            for group in signature_groups:
                lead = group[0]
                lead_ts = get_ts(lead)
                lead_sig = lead.get("signature")
                lead_type = lead.get("error_type")
                lead_comp = lead.get("component")

                # Match if same signature and within time window
                if e_sig and e_sig == lead_sig:
                    if abs(e_ts - lead_ts) <= self.time_window:
                        group.append(e)
                        placed = True
                        break

                # Match if same error type and component within 60s
                if e_type and lead_type and e_type == lead_type and e_comp == lead_comp:
                    if abs(e_ts - lead_ts) <= datetime.timedelta(seconds=60):
                        group.append(e)
                        placed = True
                        break

                # Cascading pattern match: DB timeout / connection error followed by 504 / HTTP error
                if (
                    lead_type in ("DatabasePoolExhaustion", "ConnectionRefused", "TimeoutError")
                    and e_type in ("HTTPError", "TimeoutError")
                    and abs(e_ts - lead_ts) <= self.time_window
                ):
                    group.append(e)
                    placed = True
                    break

            if not placed:
                signature_groups.append([e])

        # Combine all groups
        all_groups = list(trace_groups.values()) + signature_groups

        incidents: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []

        for group in all_groups:
            if not group:
                continue

            group.sort(key=get_ts)
            initiator = group[0]
            timestamps = [get_ts(e) for e in group if e.get("timestamp")]
            first_seen = min(timestamps) if timestamps else None
            last_seen = max(timestamps) if timestamps else None

            # Collect components
            components = list({e.get("component") for e in group if e.get("component")})
            event_ids = [e.get("id") for e in group if e.get("id")]

            # Synthesize title from primary failure
            error_type = initiator.get("error_type", "Application Error")
            initiator_msg = initiator.get("message", "")
            comp_str = f" in {components[0]}" if components else ""

            if error_type == "DatabasePoolExhaustion":
                title = f"Database Connection Pool Exhaustion{comp_str}"
            elif error_type == "OutOfMemoryError":
                title = f"Worker Process OutOfMemory Crash{comp_str}"
            elif error_type == "AuthenticationError":
                title = f"Authentication Token Expiry Cascade{comp_str}"
            elif error_type == "HTTPError":
                title = f"HTTP Gateway 5xx Failure Spike{comp_str}"
            elif error_type == "TimeoutError":
                title = f"Service Request Timeout Incident{comp_str}"
            else:
                short_msg = initiator_msg[:60].strip()
                title = f"{error_type}: {short_msg}{comp_str}"

            # Calculate deterministic initial severity
            severity = self.classify_severity(group)

            incident_dict = {
                "title": title,
                "description": f"Incident encompassing {len(group)} failure event(s). Primary trigger: {initiator_msg[:140]}",
                "severity": severity,
                "lifecycle_status": "Open",
                "first_seen": first_seen,
                "last_seen": last_seen,
                "occurrence_count": len(group),
                "related_event_ids": event_ids,
                "affected_components": components,
                "events": group,
            }
            incidents.append(incident_dict)

            # Discover relationships within group
            if len(group) > 1:
                initiator_id = initiator.get("id")
                for symptom in group[1:]:
                    symptom_id = symptom.get("id")
                    if initiator_id and symptom_id:
                        relationships.append({
                            "source_id": initiator_id,
                            "target_id": symptom_id,
                            "relationship_type": "CAUSED_BY" if initiator.get("error_type") != symptom.get("error_type") else "CO_OCCURRING",
                            "supporting_evidence": f"Initiating event at {initiator.get('timestamp')} was followed by event at {symptom.get('timestamp')} in related failure chain.",
                            "confidence": "High" if initiator.get("trace_id") and initiator.get("trace_id") == symptom.get("trace_id") else "Medium",
                        })

        return incidents, relationships

    def classify_severity(self, events: List[Dict[str, Any]]) -> str:
        """
        Deterministic safety severity rules (Milestone 5):
        - Critical: OutOfMemory, Database Pool Exhaustion, Cascading 504s, >10 occurrences in burst
        - High: Authentication failure cascade, 5xx errors, timeouts, repeated exceptions
        - Mild: Isolated warnings or single recoverable error
        """
        error_types = {e.get("error_type") for e in events}
        count = len(events)

        if "OutOfMemoryError" in error_types or "DatabasePoolExhaustion" in error_types or count >= 10:
            return "Critical"

        if "AuthenticationError" in error_types or "HTTPError" in error_types or "TimeoutError" in error_types or count >= 3:
            return "High"

        return "Mild"


correlator = IncidentCorrelator()
