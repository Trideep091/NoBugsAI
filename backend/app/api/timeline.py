"""Timeline API Routes (Milestone 7)"""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import LogEventModel, IncidentModel
from app.services.timeline_service import timeline_service

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("")
def get_timeline_data(
    file_id: Optional[str] = None,
    incident_id: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve 3-4 hour window event frequency histogram, spike markers, and AI evolution summary"""
    events = db.query(LogEventModel).filter(LogEventModel.timestamp.isnot(None)).all()
    incidents = db.query(IncidentModel).all()

    return timeline_service.generate_timeline(
        events=events,
        incidents=incidents,
        file_id=file_id,
        incident_id=incident_id,
        severity_filter=severity,
    )
