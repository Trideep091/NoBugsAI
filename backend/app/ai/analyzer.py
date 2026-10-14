"""AI Incident Root-Cause Analysis Service (Milestone 6)"""
import logging
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.models import IncidentModel, LogEventModel, AIAnalysisModel
from app.ai import get_active_ai_provider
from app.ai.base import AIConnectionError, AISchemaValidationError
from app.schemas.ai_analysis import IncidentAIAnalysisContract

logger = logging.getLogger(__name__)


class IncidentAIAnalyzer:
    """Orchestrates AI analysis, schema validation, and persistence for incidents"""

    async def analyze_incident(
        self,
        incident: IncidentModel,
        events: List[LogEventModel],
        db: Session,
        provider_preference: str = "auto",
        force_refresh: bool = False,
    ) -> IncidentAIAnalysisContract:
        """
        Executes AI analysis for an incident.
        Validates event references to prevent hallucinations.
        Persists results to database.
        """
        # If already analyzed and not forcing refresh, return existing diagnosis
        if incident.ai_analyzed and not force_refresh and incident.root_cause_hypothesis:
            return IncidentAIAnalysisContract(
                incident_title=incident.title,
                problem_summary=incident.description or incident.title,
                severity_recommendation=incident.severity,  # type: ignore
                lifecycle_status=incident.lifecycle_status,  # type: ignore
                root_cause_hypothesis=incident.root_cause_hypothesis,
                confidence=incident.ai_confidence or "Medium",  # type: ignore
                confidence_rationale=incident.ai_confidence_rationale or "Derived from event telemetry",
                supporting_event_ids=incident.supporting_evidence or [],
                alternative_hypotheses=incident.alternative_hypotheses or [],
                recommended_actions=incident.recommended_fixes or [],
                missing_information=incident.missing_information or [],
                limitations=incident.limitations or [],
            )

        provider = await get_active_ai_provider(provider_preference)
        logger.info("Executing incident analysis with provider '%s' for incident '%s'", provider.name, incident.id)

        # Prepare sanitized event dictionaries
        sanitized_events: List[Dict[str, Any]] = []
        valid_event_ids = set()

        for ev in events:
            valid_event_ids.add(ev.id)
            sanitized_events.append({
                "id": ev.id,
                "line_number": ev.original_line_number,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                "log_level": ev.log_level,
                "component": ev.component,
                "message": ev.message,
                "stack_trace": ev.stack_trace,
                "trace_id": ev.trace_id,
                "error_type": ev.error_type,
            })

        incident_summary = {
            "id": incident.id,
            "title": incident.title,
            "severity": incident.severity,
            "occurrence_count": incident.occurrence_count,
            "first_seen": incident.first_seen.isoformat() if incident.first_seen else None,
            "last_seen": incident.last_seen.isoformat() if incident.last_seen else None,
            "affected_components": incident.affected_components,
        }

        # Run model analysis
        analysis: IncidentAIAnalysisContract = await provider.analyze_incident(
            incident_summary=incident_summary,
            supporting_events=sanitized_events,
        )

        # Filter out any hallucinated event IDs not in the actual incident
        verified_event_ids = [
            eid for eid in analysis.supporting_event_ids if eid in valid_event_ids
        ]
        # Fallback to actual event IDs if model returned empty or invalid IDs
        if not verified_event_ids and valid_event_ids:
            verified_event_ids = list(valid_event_ids)[:5]
        analysis.supporting_event_ids = verified_event_ids

        # Update Incident in database
        incident.root_cause_hypothesis = analysis.root_cause_hypothesis
        incident.ai_confidence = analysis.confidence
        incident.ai_confidence_rationale = analysis.confidence_rationale
        incident.supporting_evidence = verified_event_ids
        incident.alternative_hypotheses = analysis.alternative_hypotheses
        incident.recommended_fixes = [a.model_dump() for a in analysis.recommended_actions]
        incident.missing_information = analysis.missing_information
        incident.limitations = analysis.limitations
        incident.last_analysis_timestamp = datetime.datetime.now(datetime.timezone.utc)
        incident.ai_analyzed = True
        incident.ai_provider_used = provider.name

        # Create AIAnalysisModel record
        ai_record = AIAnalysisModel(
            incident_id=incident.id,
            model_name=provider.name,
            analysis_timestamp=datetime.datetime.now(datetime.timezone.utc),
            diagnosis=analysis.root_cause_hypothesis,
            evidence_references=verified_event_ids,
            confidence_rationale=analysis.confidence_rationale,
            recommended_actions=[a.model_dump() for a in analysis.recommended_actions],
            limitations_and_missing=analysis.missing_information + analysis.limitations,
            raw_response=analysis.model_dump(),
        )
        db.add(ai_record)
        db.commit()
        db.refresh(incident)

        return analysis


incident_analyzer = IncidentAIAnalyzer()
