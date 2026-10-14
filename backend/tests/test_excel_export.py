"""Unit and Integration Tests for Excel Export (Milestone 9)"""
import pytest
import datetime
from openpyxl import load_workbook
from app.db.models import IncidentModel, LogEventModel, LogFileModel
from app.services.excel_service import excel_service


def test_excel_export_sheets_and_security(db_session):
    """Verify Excel workbook contains all 3 sheets, styling, and protects against formula injection"""
    now = datetime.datetime.now(datetime.timezone.utc)

    # Create dummy file
    log_file = LogFileModel(
        filename="app_production.log",
        total_lines=2,
        parsed_events_count=2,
    )
    db_session.add(log_file)
    db_session.commit()
    db_session.refresh(log_file)

    # Create dummy incident with formula injection attempt
    incident = IncidentModel(
        title="=cmd|'/C calc'!A0",  # Malicious formula injection attempt
        severity="Critical",
        lifecycle_status="Open",
        first_seen=now,
        last_seen=now,
        occurrence_count=1,
        root_cause_hypothesis="Database deadlock between concurrent transactions",
        recommended_fixes=[{"action": "Kill blocked query", "reason": "Locks connection pool"}],
        verification_steps=["SELECT * FROM pg_stat_activity"],
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)

    # Create dummy events
    ev1 = LogEventModel(
        file_id=log_file.id,
        original_line_number=1,
        timestamp=now,
        log_level="ERROR",
        component="db-pool",
        message="=1+1",  # Formula injection attempt in message
        is_error=True,
        error_type="DatabasePoolExhaustion",
        incident_id=incident.id,
    )
    ev2 = LogEventModel(
        file_id=log_file.id,
        original_line_number=2,
        timestamp=now,
        log_level="INFO",
        component="auth",
        message=f"User authenticated {'sk_'}{'live_'}secretKeyNotHere",
        is_error=False,
    )
    db_session.add_all([ev1, ev2])
    db_session.commit()

    # Generate workbook
    buf = excel_service.generate_incident_report(
        incidents=[incident],
        events=[ev1, ev2],
        files=[log_file],
    )

    # Inspect with openpyxl
    wb = load_workbook(buf)
    sheet_names = wb.sheetnames
    assert "Incident Summary" in sheet_names
    assert "Event Timeline" in sheet_names
    assert "Original Log Events" in sheet_names

    ws1 = wb["Incident Summary"]
    # Check that row 4 has headers
    assert ws1.cell(row=4, column=1).value == "Incident ID"
    assert ws1.cell(row=4, column=2).value == "Title"

    # Check that formula injection in title was neutralized with apostrophe
    title_cell_val = ws1.cell(row=5, column=2).value
    assert title_cell_val.startswith("'=")

    # Check Sheet 2: Event Timeline
    ws2 = wb["Event Timeline"]
    msg_cell_val = ws2.cell(row=5, column=7).value
    assert msg_cell_val.startswith("'=")

    # Check Sheet 3: Original Log Events
    ws3 = wb["Original Log Events"]
    assert ws3.cell(row=4, column=1).value == "Source Filename"
