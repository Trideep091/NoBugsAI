"""Interactive Timeline and Historical Evolution Service (Milestone 7)"""
import datetime
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.db.models import LogEventModel, IncidentModel


class TimelineService:
    """Generates time-bucketed event histograms and incident evolution summaries"""

    def generate_timeline(
        self,
        events: List[LogEventModel],
        incidents: List[IncidentModel],
        file_id: Optional[str] = None,
        incident_id: Optional[str] = None,
        severity_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Aggregates events into time buckets across the log time window.
        Distinguishes Critical, High, and Mild event counts.
        Detects frequency spikes.
        """
        # Filter events with valid timestamps
        timed_events = [e for e in events if e.timestamp is not None]
        if file_id:
            timed_events = [e for e in timed_events if e.file_id == file_id]
        if incident_id:
            timed_events = [e for e in timed_events if e.incident_id == incident_id]

        if not timed_events:
            return {
                "has_data": False,
                "time_range_start": None,
                "time_range_end": None,
                "duration_hours": 0.0,
                "covers_target_range": False,
                "buckets": [],
                "total_events": 0,
                "incident_count": len(incidents),
                "ai_evolution_summary": "No timestamped log events available to generate a timeline.",
            }

        # Sort chronologically
        timed_events.sort(key=lambda e: e.timestamp)
        start_time = timed_events[0].timestamp
        end_time = timed_events[-1].timestamp
        duration_seconds = max((end_time - start_time).total_seconds(), 1.0)
        duration_hours = round(duration_seconds / 3600.0, 2)
        covers_target_range = 3.0 <= duration_hours <= 5.0

        # Choose appropriate bucket size:
        # e.g., if duration < 1 hour: 2-minute buckets; if 1-4 hours: 5-minute buckets; if > 4 hours: 15-minute
        if duration_hours < 1.0:
            bucket_delta = datetime.timedelta(minutes=2)
        elif duration_hours <= 6.0:
            bucket_delta = datetime.timedelta(minutes=5)
        else:
            bucket_delta = datetime.timedelta(minutes=15)

        # Map incident severity lookup
        incident_severity_map = {inc.id: inc.severity for inc in incidents}

        # Populate buckets
        bucket_data = defaultdict(lambda: {"total": 0, "critical": 0, "high": 0, "mild": 0, "is_spike": False})

        for e in timed_events:
            # Determine effective severity of event
            inc_sev = incident_severity_map.get(e.incident_id, "Mild") if e.incident_id else None
            effective_sev = inc_sev or ("Critical" if e.log_level in ("CRITICAL", "FATAL") else "High" if e.log_level in ("ERROR", "ERR") else "Mild")

            if severity_filter and effective_sev.lower() != severity_filter.lower():
                continue

            # Snap to bucket start
            offset_seconds = (e.timestamp - start_time).total_seconds()
            bucket_index = int(offset_seconds // bucket_delta.total_seconds())
            bucket_ts = start_time + (bucket_index * bucket_delta)
            ts_str = bucket_ts.strftime("%Y-%m-%d %H:%M")

            b = bucket_data[ts_str]
            b["total"] += 1
            if effective_sev == "Critical":
                b["critical"] += 1
            elif effective_sev == "High":
                b["high"] += 1
            else:
                b["mild"] += 1

        # Check for error frequency spikes (buckets where total > 2 * average)
        totals = [b["total"] for b in bucket_data.values()]
        avg_total = sum(totals) / max(len(totals), 1)
        spike_threshold = max(avg_total * 2.0, 4)

        buckets_list = []
        for ts_str in sorted(bucket_data.keys()):
            data = bucket_data[ts_str]
            is_spike = data["total"] >= spike_threshold and (data["critical"] + data["high"]) > 0
            buckets_list.append({
                "timestamp": ts_str,
                "label": ts_str.split(" ")[1] if " " in ts_str else ts_str,
                "total_events": data["total"],
                "critical_count": data["critical"],
                "high_count": data["high"],
                "mild_count": data["mild"],
                "is_spike": is_spike,
            })

        # Generate grounded evolution summary
        spike_count = sum(1 for b in buckets_list if b["is_spike"])
        summary = (
            f"Logs span {duration_hours} hour(s) from {start_time.strftime('%H:%M:%S')} to {end_time.strftime('%H:%M:%S')}. "
            f"Detected {len(incidents)} active incident(s) across {len(timed_events)} timestamped event(s). "
        )
        if spike_count > 0:
            summary += f"Identified {spike_count} high-frequency failure burst spike(s) exceeding normal baseline activity."
        else:
            summary += "Event frequency was distributed steadily across the recorded observation window."

        if not covers_target_range:
            if duration_hours < 3.0:
                summary += f" Note: Available log window ({duration_hours}h) is shorter than the standard 3–4 hour observation interval."
            else:
                summary += f" Note: Available log window ({duration_hours}h) exceeds the standard 3–4 hour observation interval."

        return {
            "has_data": True,
            "time_range_start": start_time.isoformat(),
            "time_range_end": end_time.isoformat(),
            "duration_hours": duration_hours,
            "covers_target_range": covers_target_range,
            "buckets": buckets_list,
            "total_events": len(timed_events),
            "incident_count": len(incidents),
            "ai_evolution_summary": summary,
        }


timeline_service = TimelineService()
