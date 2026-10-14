"""Incident Investigation and AI Root-Cause Analysis API Routes (Milestones 5, 6, 8)"""
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.db.models import IncidentModel, LogEventModel, IncidentRelationshipModel
from app.ai.analyzer import incident_analyzer
from app.schemas.ai_analysis import IncidentAIAnalysisContract, AIAnalysisRequest

router = APIRouter(prefix="/incidents", tags=["Incidents"])


class StatusUpdateRequest(BaseModel):
    status: Literal["Open", "Investigating", "Resolved", "Reopened"]


@router.get("")
def get_incidents(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all correlated incidents with optional filtering"""
    query = db.query(IncidentModel)

    if severity:
        query = query.filter(IncidentModel.severity == severity)
    if status:
        query = query.filter(IncidentModel.lifecycle_status == status)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(IncidentModel.title.ilike(search_filter) | IncidentModel.description.ilike(search_filter))

    incidents = query.order_by(
        # Critical first, then High, then Mild
        desc(IncidentModel.severity == "Critical"),
        desc(IncidentModel.severity == "High"),
        desc(IncidentModel.last_seen),
    ).all()

    return [
        {
            "id": inc.id,
            "title": inc.title,
            "description": inc.description,
            "severity": inc.severity,
            "lifecycle_status": inc.lifecycle_status,
            "first_seen": inc.first_seen.isoformat() if inc.first_seen else None,
            "last_seen": inc.last_seen.isoformat() if inc.last_seen else None,
            "occurrence_count": inc.occurrence_count,
            "related_event_ids": inc.related_event_ids,
            "affected_components": inc.affected_components,
            "root_cause_hypothesis": inc.root_cause_hypothesis,
            "supporting_evidence": inc.supporting_evidence,
            "alternative_hypotheses": inc.alternative_hypotheses,
            "ai_confidence": inc.ai_confidence,
            "ai_confidence_rationale": inc.ai_confidence_rationale,
            "recommended_fixes": inc.recommended_fixes,
            "verification_steps": inc.verification_steps,
            "missing_information": inc.missing_information,
            "limitations": inc.limitations,
            "last_analysis_timestamp": inc.last_analysis_timestamp.isoformat() if inc.last_analysis_timestamp else None,
            "ai_analyzed": inc.ai_analyzed,
            "ai_provider_used": inc.ai_provider_used,
        }
        for inc in incidents
    ]


@router.get("/{incident_id}")
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)):
    """Retrieve full incident details including associated events and discovered relationships"""
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = db.query(LogEventModel).filter(LogEventModel.incident_id == incident_id).order_by(LogEventModel.original_line_number).all()

    # Discover relationships involving this incident's events
    event_ids = [e.id for e in events]
    relationships = db.query(IncidentRelationshipModel).filter(
        (IncidentRelationshipModel.source_id.in_(event_ids)) | (IncidentRelationshipModel.target_id.in_(event_ids))
    ).all()

    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "lifecycle_status": incident.lifecycle_status,
        "first_seen": incident.first_seen.isoformat() if incident.first_seen else None,
        "last_seen": incident.last_seen.isoformat() if incident.last_seen else None,
        "occurrence_count": incident.occurrence_count,
        "related_event_ids": incident.related_event_ids,
        "affected_components": incident.affected_components,
        "root_cause_hypothesis": incident.root_cause_hypothesis,
        "supporting_evidence": incident.supporting_evidence,
        "alternative_hypotheses": incident.alternative_hypotheses,
        "ai_confidence": incident.ai_confidence,
        "ai_confidence_rationale": incident.ai_confidence_rationale,
        "recommended_fixes": incident.recommended_fixes,
        "verification_steps": incident.verification_steps,
        "missing_information": incident.missing_information,
        "limitations": incident.limitations,
        "last_analysis_timestamp": incident.last_analysis_timestamp.isoformat() if incident.last_analysis_timestamp else None,
        "ai_analyzed": incident.ai_analyzed,
        "ai_provider_used": incident.ai_provider_used,
        "events": [
            {
                "id": ev.id,
                "file_id": ev.file_id,
                "original_line_number": ev.original_line_number,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                "log_level": ev.log_level,
                "component": ev.component,
                "message": ev.message,
                "stack_trace": ev.stack_trace,
                "trace_id": ev.trace_id,
                "request_id": ev.request_id,
                "incident_id": ev.incident_id,
                "is_error": ev.is_error,
                "error_type": ev.error_type,
                "is_malformed": ev.is_malformed,
            }
            for ev in events
        ],
        "relationships": [
            {
                "id": r.id,
                "source_id": r.source_id,
                "target_id": r.target_id,
                "relationship_type": r.relationship_type,
                "supporting_evidence": r.supporting_evidence,
                "confidence": r.confidence,
            }
            for r in relationships
        ],
    }


@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update incident lifecycle status (Open, Investigating, Resolved, Reopened)"""
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.lifecycle_status = payload.status
    db.commit()
    db.refresh(incident)

    return {
        "id": incident.id,
        "title": incident.title,
        "severity": incident.severity,
        "lifecycle_status": incident.lifecycle_status,
    }


@router.post("/{incident_id}/analyze", response_model=IncidentAIAnalysisContract)
async def run_ai_incident_analysis(
    incident_id: str,
    payload: AIAnalysisRequest,
    db: Session = Depends(get_db),
):
    """Trigger AI root-cause analysis for an incident"""
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = db.query(LogEventModel).filter(LogEventModel.incident_id == incident_id).order_by(LogEventModel.original_line_number).all()

    analysis = await incident_analyzer.analyze_incident(
        incident=incident,
        events=events,
        db=db,
        provider_preference=payload.provider_override or "auto",
        force_refresh=payload.force_refresh,
    )

    return analysis
