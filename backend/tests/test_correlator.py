"""Unit Tests for Error Detector, Correlator, and Severity Classification (Milestones 3, 4, 5)"""
import pytest
import datetime
from app.pipeline.error_detector import error_detector
from app.pipeline.correlator import correlator


def test_signature_normalization():
    msg1 = "Connection pool exhausted for worker 12 at IP 192.168.1.10:5432 after 30.5s with UUID 123e4567-e89b-12d3-a456-426614174000"
    msg2 = "Connection pool exhausted for worker 44 at IP 10.0.0.8:5432 after 15.2s with UUID 987e4567-e89b-12d3-a456-426614174999"
    
    sig1 = error_detector.compute_signature(msg1, component="postgres")
    sig2 = error_detector.compute_signature(msg2, component="postgres")
    assert sig1 == sig2  # Same normalized signature despite different worker IDs, IPs, and UUIDs


def test_error_classification():
    is_err, err_type = error_detector.classify_event("ERROR", "java.lang.OutOfMemoryError: Java heap space")
    assert is_err is True
    assert err_type == "OutOfMemoryError"

    is_err, err_type = error_detector.classify_event("ERROR", "psycopg2.OperationalError: connection pool exhausted")
    assert is_err is True
    assert err_type == "DatabasePoolExhaustion"

    is_err, err_type = error_detector.classify_event("INFO", "Normal periodic cron heartbeat")
    assert is_err is False
    assert err_type is None


def test_trace_id_correlation():
    base_time = datetime.datetime(2026, 10, 14, 10, 0, 0, tzinfo=datetime.timezone.utc)
    events = [
        {
            "id": "ev-1",
            "message": "Auth service rejected token: Signature has expired",
            "log_level": "ERROR",
            "trace_id": "trace-xyz-100",
            "is_error": True,
            "error_type": "AuthenticationError",
            "timestamp": base_time,
            "component": "auth-service",
        },
        {
            "id": "ev-2",
            "message": "API gateway request failed with 401 Unauthorized",
            "log_level": "ERROR",
            "trace_id": "trace-xyz-100",
            "is_error": True,
            "error_type": "HTTPError",
            "timestamp": base_time + datetime.timedelta(seconds=2),
            "component": "api-gateway",
        },
    ]

    incidents, relationships = correlator.correlate_events(events)
    assert len(incidents) == 1
    assert incidents[0]["occurrence_count"] == 2
    assert "auth-service" in incidents[0]["affected_components"]
    assert "api-gateway" in incidents[0]["affected_components"]
    assert len(relationships) == 1
    assert relationships[0]["relationship_type"] == "CAUSED_BY"
    assert relationships[0]["source_id"] == "ev-1"
    assert relationships[0]["target_id"] == "ev-2"


def test_cascading_db_timeout_correlation():
    base_time = datetime.datetime(2026, 10, 14, 11, 0, 0, tzinfo=datetime.timezone.utc)
    events = [
        {
            "id": "ev-db",
            "message": "OperationalError: connection pool exhausted",
            "log_level": "ERROR",
            "is_error": True,
            "error_type": "DatabasePoolExhaustion",
            "timestamp": base_time,
            "component": "db-worker",
            "signature": "sig-db-pool",
        },
        {
            "id": "ev-gw",
            "message": "HTTP 504 Gateway Timeout on /checkout",
            "log_level": "ERROR",
            "is_error": True,
            "error_type": "HTTPError",
            "timestamp": base_time + datetime.timedelta(seconds=15),
            "component": "web-gateway",
            "signature": "sig-gw-504",
        },
    ]

    incidents, relationships = correlator.correlate_events(events)
    assert len(incidents) == 1
    assert incidents[0]["severity"] == "Critical"
    assert len(relationships) == 1
    assert relationships[0]["source_id"] == "ev-db"


def test_severity_classification_rules():
    assert correlator.classify_severity([{"error_type": "OutOfMemoryError"}]) == "Critical"
    assert correlator.classify_severity([{"error_type": "DatabasePoolExhaustion"}]) == "Critical"
    assert correlator.classify_severity([{"error_type": "AuthenticationError"}]) == "High"
    assert correlator.classify_severity([{"error_type": "GenericApplicationError"}]) == "Mild"
