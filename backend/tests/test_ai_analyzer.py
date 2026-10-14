"""Unit and Integration Tests for AI Analysis and Schema Validation (Milestone 6)"""
import pytest
import datetime
from app.db.models import IncidentModel, LogEventModel
from app.ai.analyzer import incident_analyzer
from app.ai.mock_provider import MockOfflineAIProvider
from app.schemas.ai_analysis import IncidentAIAnalysisContract


@pytest.mark.asyncio
async def test_ai_analysis_schema_contract(db_session):
    """Verify AI analyzer produces a strictly compliant schema referencing valid events"""
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Create test incident
    incident = IncidentModel(
        title="PostgreSQL Connection Pool Exhaustion",
        severity="Critical",
        lifecycle_status="Open",
        first_seen=now,
        last_seen=now,
        occurrence_count=2,
        affected_components=["checkout-service", "postgres"],
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)

    # Create associated events
    ev1 = LogEventModel(
        file_id="dummy-file",
        original_line_number=10,
        timestamp=now,
        log_level="ERROR",
        component="postgres",
        message="OperationalError: connection pool exhausted, max_connections reached",
        is_error=True,
        error_type="DatabasePoolExhaustion",
        incident_id=incident.id,
    )
    ev2 = LogEventModel(
        file_id="dummy-file",
        original_line_number=12,
        timestamp=now + datetime.timedelta(seconds=5),
        log_level="ERROR",
        component="checkout-service",
        message="HTTP 504 Gateway Timeout while acquiring DB connection",
        is_error=True,
        error_type="TimeoutError",
        incident_id=incident.id,
    )
    db_session.add_all([ev1, ev2])
    db_session.commit()
    db_session.refresh(ev1)
    db_session.refresh(ev2)

    # Analyze with mock_offline provider
    analysis: IncidentAIAnalysisContract = await incident_analyzer.analyze_incident(
        incident=incident,
        events=[ev1, ev2],
        db=db_session,
        provider_preference="mock_offline",
        force_refresh=True,
    )

    # Verify contract fields
    assert analysis.incident_title is not None
    assert analysis.problem_summary is not None
    assert analysis.severity_recommendation in ["Critical", "High", "Mild"]
    assert analysis.lifecycle_status in ["Open", "Investigating", "Resolved", "Reopened"]
    assert analysis.root_cause_hypothesis is not None
    assert analysis.confidence in ["High", "Medium", "Low"]
    assert len(analysis.recommended_actions) >= 1
    assert analysis.recommended_actions[0].action is not None
    assert analysis.recommended_actions[0].reason is not None
    assert analysis.recommended_actions[0].verification is not None
    assert len(analysis.alternative_hypotheses) >= 1

    # Verify anti-hallucination: every supporting event ID must exist in [ev1.id, ev2.id]
    for eid in analysis.supporting_event_ids:
        assert eid in [ev1.id, ev2.id]

    # Verify DB persistence
    db_session.refresh(incident)
    assert incident.ai_analyzed is True
    assert incident.root_cause_hypothesis == analysis.root_cause_hypothesis
    assert incident.ai_confidence == analysis.confidence
