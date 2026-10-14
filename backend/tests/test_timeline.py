"""Unit and Integration Tests for Interactive Timeline (Milestone 7)"""
import pytest
import datetime
from app.db.models import IncidentModel, LogEventModel
from app.services.timeline_service import timeline_service


def test_timeline_target_range_and_buckets():
    """Verify timeline calculates target range coverage (3-4h) and generates buckets with spike detection"""
    start_time = datetime.datetime(2026, 10, 14, 10, 0, 0, tzinfo=datetime.timezone.utc)
    
    # Generate 3.5 hours of events (target range)
    events = []
    for m in range(0, 210, 5):  # 210 minutes = 3.5 hours
        ts = start_time + datetime.timedelta(minutes=m)
        is_burst = 60 <= m <= 70  # Burst spike between minute 60 and 70
        count = 10 if is_burst else 1
        for _ in range(count):
            events.append(LogEventModel(
                file_id="f1",
                original_line_number=m,
                timestamp=ts,
                log_level="ERROR" if is_burst else "INFO",
                message=f"Event at minute {m}",
                is_error=is_burst,
                incident_id="inc-1" if is_burst else None,
            ))

    incident = IncidentModel(
        id="inc-1",
        title="Failure Burst Spike",
        severity="Critical",
        lifecycle_status="Open",
    )

    result = timeline_service.generate_timeline(
        events=events,
        incidents=[incident],
    )

    assert result["has_data"] is True
    assert result["covers_target_range"] is True  # 3.5h is within 3-5h
    assert result["duration_hours"] >= 3.4
    assert len(result["buckets"]) > 0

    # Verify spike detection occurred in burst window
    spikes = [b for b in result["buckets"] if b["is_spike"]]
    assert len(spikes) >= 1
    assert "Spike" in result["ai_evolution_summary"] or "spike" in result["ai_evolution_summary"]


def test_timeline_empty_fallback():
    """Verify graceful handling when no timestamped events are present"""
    result = timeline_service.generate_timeline(events=[], incidents=[])
    assert result["has_data"] is False
    assert result["covers_target_range"] is False
    assert result["buckets"] == []
    assert "No timestamped log events" in result["ai_evolution_summary"]
