"""Logs Ingestion and Query API Routes (Milestones 1 & 2)"""
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
import logging
from app.config import settings
from app.db.session import get_db
from app.db.models import LogFileModel, LogEventModel, IncidentModel, IncidentRelationshipModel
from app.pipeline.parser import log_parser
from app.pipeline.error_detector import error_detector
from app.pipeline.correlator import correlator
from app.ai.analyzer import incident_analyzer

logger = logging.getLogger("nobugs.logs")

router = APIRouter(prefix="/logs", tags=["Logs"])


class PasteLogRequest(BaseModel):
    content: str
    filename: Optional[str] = "pasted_logs.log"


class SampleLogRequest(BaseModel):
    scenario: str  # 'postgres_pool', 'microservices_cascade', 'oom_crash', 'webhook_crypto'


async def process_and_persist_log_content(content: str, filename: str, db: Session):
    """Core log processing pipeline: parse -> redact -> error detect -> correlate -> persist"""
    # 1. Parse and redact
    events_drafts, summary = log_parser.parse_log_content(content, filename=filename)

    # 2. Error detection & classification
    enriched_events = error_detector.enrich_events(events_drafts)

    # 3. Create LogFileModel
    file_record = LogFileModel(
        filename=filename,
        total_lines=summary["total_lines"],
        parsed_events_count=summary["parsed_events_count"],
        error_events_count=summary["error_events_count"],
        time_range_start=summary["time_range_start"],
        time_range_end=summary["time_range_end"],
        processing_errors=summary["processing_errors"],
        raw_preview=content[:2000],
        redaction_count=summary["redaction_count"],
        parsing_status="PARSED",
    )
    db.add(file_record)
    db.flush()

    # 4. Create LogEventModel instances
    event_model_map = {}
    db_events = []
    for ev in enriched_events:
        ev_id = str(uuid.uuid4())
        ev["id"] = ev_id
        db_ev = LogEventModel(
            id=ev_id,
            file_id=file_record.id,
            original_line_number=ev["original_line_number"],
            timestamp=ev["timestamp"],
            log_level=ev["log_level"],
            component=ev["component"],
            message=ev["message"],
            stack_trace=ev["stack_trace"],
            trace_id=ev["trace_id"],
            request_id=ev["request_id"],
            is_error=ev["is_error"],
            error_type=ev["error_type"],
            signature=ev["signature"],
            is_malformed=ev["is_malformed"],
        )
        db_events.append(db_ev)
        event_model_map[ev_id] = db_ev

    db.add_all(db_events)
    db.flush()

    # 5. Correlate events into incidents
    incidents_drafts, relationships_drafts = correlator.correlate_events(enriched_events)
    primary_db_inc = None

    for inc in incidents_drafts:
        inc_id = str(uuid.uuid4())
        group_events = inc.pop("events", [])
        event_ids = [e["id"] for e in group_events]

        db_inc = IncidentModel(
            id=inc_id,
            title=inc["title"],
            description=inc["description"],
            severity=inc["severity"],
            lifecycle_status=inc["lifecycle_status"],
            first_seen=inc["first_seen"],
            last_seen=inc["last_seen"],
            occurrence_count=inc["occurrence_count"],
            related_event_ids=event_ids,
            affected_components=inc["affected_components"],
        )
        db.add(db_inc)
        db.flush()

        if primary_db_inc is None:
            primary_db_inc = db_inc

        # Link events to incident
        for eid in event_ids:
            if eid in event_model_map:
                event_model_map[eid].incident_id = inc_id

    # 6. Save discovered relationships
    for rel in relationships_drafts:
        db_rel = IncidentRelationshipModel(
            source_id=rel["source_id"],
            target_id=rel["target_id"],
            relationship_type=rel["relationship_type"],
            supporting_evidence=rel["supporting_evidence"],
            confidence=rel["confidence"],
        )
        db.add(db_rel)

    db.commit()
    db.refresh(file_record)

    # 7. Auto-run AI root-cause analysis on primary incident for instant suggestions
    if primary_db_inc:
        try:
            inc_events = [e for e in db_events if e.incident_id == primary_db_inc.id]
            await incident_analyzer.analyze_incident(
                incident=primary_db_inc,
                events=inc_events,
                db=db,
                provider_preference="auto",
                force_refresh=False,
            )
        except Exception as e:
            logger.warning("Automatic AI incident analysis skipped: %s", str(e))

    return {
        "file": {
            "id": file_record.id,
            "filename": file_record.filename,
            "upload_timestamp": file_record.upload_timestamp.isoformat(),
            "parsing_status": file_record.parsing_status,
            "total_lines": file_record.total_lines,
            "parsed_events_count": file_record.parsed_events_count,
            "error_events_count": file_record.error_events_count,
            "time_range_start": file_record.time_range_start.isoformat() if file_record.time_range_start else None,
            "time_range_end": file_record.time_range_end.isoformat() if file_record.time_range_end else None,
            "processing_errors": file_record.processing_errors,
            "raw_preview": file_record.raw_preview,
            "redaction_count": file_record.redaction_count,
        },
        "primary_incident_id": primary_db_inc.id if primary_db_inc else None,
        "events_sample": [
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
            for ev in db_events[:25]
        ],
        "redacted_count": summary["redaction_count"],
        "redaction_samples": summary["redaction_samples"],
    }


@router.post("/upload")
async def upload_log_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Drag-and-drop or file selector upload endpoint"""
    # Validate extension
    filename = file.filename or "upload.log"
    ext = os.path.splitext(filename)[1].lower()
    if ext and ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # Read content with size guard
    content_bytes = await file.read()
    if len(content_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum upload size limit ({settings.MAX_UPLOAD_SIZE_BYTES / (1024*1024):.1f} MB)",
        )

    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    return await process_and_persist_log_content(content, filename, db)


@router.post("/paste")
async def paste_logs(payload: PasteLogRequest, db: Session = Depends(get_db)):
    """Copy-and-paste log ingestion endpoint"""
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Log content cannot be empty.")

    if len(payload.content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Content exceeds size limit ({settings.MAX_UPLOAD_SIZE_BYTES / (1024*1024):.1f} MB)",
        )

    filename = payload.filename or "pasted_logs.log"
    return await process_and_persist_log_content(payload.content, filename, db)


@router.get("/files")
def get_log_files(db: Session = Depends(get_db)):
    """Retrieve all uploaded log files"""
    files = db.query(LogFileModel).order_by(desc(LogFileModel.upload_timestamp)).all()
    return [
        {
            "id": f.id,
            "filename": f.filename,
            "upload_timestamp": f.upload_timestamp.isoformat(),
            "parsing_status": f.parsing_status,
            "total_lines": f.total_lines,
            "parsed_events_count": f.parsed_events_count,
            "error_events_count": f.error_events_count,
            "time_range_start": f.time_range_start.isoformat() if f.time_range_start else None,
            "time_range_end": f.time_range_end.isoformat() if f.time_range_end else None,
            "processing_errors": f.processing_errors,
            "raw_preview": f.raw_preview,
            "redaction_count": f.redaction_count,
        }
        for f in files
    ]


@router.get("/events")
def get_log_events(
    file_id: Optional[str] = None,
    incident_id: Optional[str] = None,
    level: Optional[str] = None,
    is_error: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Query and filter individual log events with pagination"""
    query = db.query(LogEventModel)

    if file_id:
        query = query.filter(LogEventModel.file_id == file_id)
    if incident_id:
        query = query.filter(LogEventModel.incident_id == incident_id)
    if level:
        query = query.filter(LogEventModel.log_level == level.upper())
    if is_error is not None:
        query = query.filter(LogEventModel.is_error == is_error)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(LogEventModel.message.ilike(search_filter) | LogEventModel.component.ilike(search_filter))

    total = query.count()
    items = query.order_by(LogEventModel.original_line_number).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
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
            for ev in items
        ],
    }


@router.delete("/clear")
def clear_all_data(db: Session = Depends(get_db)):
    """Reset session database tables"""
    db.query(IncidentRelationshipModel).delete()
    db.query(LogEventModel).delete()
    db.query(IncidentModel).delete()
    db.query(LogFileModel).delete()
    db.commit()
    return {"success": True, "message": "All session data cleared."}


@router.post("/sample")
async def load_sample_log(payload: SampleLogRequest, db: Session = Depends(get_db)):
    """Load one of the realistic production failure scenarios from sample_logs/"""
    scenario_files = {
        "postgres_pool": ("postgres_pool_exhaustion_504.log", "sample_logs/postgres_pool_exhaustion_504.log"),
        "microservices_cascade": ("microservices_cascade_failure.log", "sample_logs/microservices_cascade_failure.log"),
        "oom_crash": ("oom_worker_crash.log", "sample_logs/oom_worker_crash.log"),
        "webhook_crypto": ("payment_webhook_crypto_error.log", "sample_logs/payment_webhook_crypto_error.log"),
    }

    if payload.scenario not in scenario_files:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{payload.scenario}'. Available: {list(scenario_files.keys())}",
        )

    fname, path = scenario_files[payload.scenario]
    # Check current or parent path
    full_path = path if os.path.exists(path) else os.path.join("..", path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail=f"Sample log file not found at {full_path}")

    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()

    return await process_and_persist_log_content(content, fname, db)


@router.get("/files/{file_id}/analysis")
async def get_file_ai_analysis(file_id: str, db: Session = Depends(get_db)):
    """Analyze and suggest problem-specific remediation for a tapped/selected log file"""
    file_record = db.query(LogFileModel).filter(LogFileModel.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="Log file not found")

    events = db.query(LogEventModel).filter(LogEventModel.file_id == file_id).all()
    # Find incidents linked to these events
    incident_ids = list({e.incident_id for e in events if e.incident_id})
    incidents = db.query(IncidentModel).filter(IncidentModel.id.in_(incident_ids)).all() if incident_ids else []

    primary_incident = incidents[0] if incidents else None
    analysis = None

    if primary_incident:
        inc_events = [e for e in events if e.incident_id == primary_incident.id]
        analysis = await incident_analyzer.analyze_incident(
            incident=primary_incident,
            events=inc_events,
            db=db,
            provider_preference="auto",
            force_refresh=False,
        )

    return {
        "file": {
            "id": file_record.id,
            "filename": file_record.filename,
            "total_lines": file_record.total_lines,
            "parsed_events_count": file_record.parsed_events_count,
            "error_events_count": file_record.error_events_count,
            "time_range_start": file_record.time_range_start.isoformat() if file_record.time_range_start else None,
            "time_range_end": file_record.time_range_end.isoformat() if file_record.time_range_end else None,
            "redaction_count": file_record.redaction_count,
        },
        "primary_incident": {
            "id": primary_incident.id,
            "title": primary_incident.title,
            "description": primary_incident.description,
            "severity": primary_incident.severity,
            "lifecycle_status": primary_incident.lifecycle_status,
            "root_cause_hypothesis": primary_incident.root_cause_hypothesis,
            "ai_confidence": primary_incident.ai_confidence,
            "ai_confidence_rationale": primary_incident.ai_confidence_rationale,
            "recommended_fixes": primary_incident.recommended_fixes,
            "verification_steps": primary_incident.verification_steps,
            "alternative_hypotheses": primary_incident.alternative_hypotheses,
            "supporting_evidence": primary_incident.supporting_evidence,
            "missing_information": primary_incident.missing_information,
            "limitations": primary_incident.limitations,
            "ai_analyzed": primary_incident.ai_analyzed,
        } if primary_incident else None,
        "analysis": analysis.model_dump() if analysis else None,
        "total_incidents": len(incidents),
        "has_errors": file_record.error_events_count > 0,
    }


