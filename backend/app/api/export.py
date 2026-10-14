"""Excel Export API Routes (Milestone 9)"""
import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import IncidentModel, LogEventModel, LogFileModel
from app.services.excel_service import excel_service

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/excel")
def export_excel_report(db: Session = Depends(get_db)):
    """Export investigation findings into a styled 3-sheet Excel workbook (.xlsx)"""
    incidents = db.query(IncidentModel).all()
    events = db.query(LogEventModel).all()
    files = db.query(LogFileModel).all()

    buffer = excel_service.generate_incident_report(
        incidents=incidents,
        events=events,
        files=files,
    )

    timestamp_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"nobugs_ai_incident_report_{timestamp_str}.xlsx"

    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
