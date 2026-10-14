"""Unit Tests for Log Ingestion and Parser (Milestone 1)"""
import pytest
import datetime
from app.pipeline.parser import log_parser


def test_parse_json_log_line():
    line = '{"timestamp": "2026-10-14T10:00:00Z", "level": "ERROR", "service": "payment-api", "message": "Failed to charge card", "trace_id": "tr-987654"}'
    draft = log_parser.parse_json_line(line, 1)
    assert draft is not None
    assert draft.log_level == "ERROR"
    assert draft.component == "payment-api"
    assert draft.message == "Failed to charge card"
    assert draft.trace_id == "tr-987654"
    assert draft.is_error is True
    assert draft.timestamp is not None


def test_parse_text_log_line():
    line = "2026-10-14 10:15:30.123 [WARN] [auth-service] trace_id=tr-112233 User authentication rate limit exceeded"
    draft = log_parser.parse_text_line(line, 1)
    assert draft is not None
    assert draft.log_level == "WARN"
    assert draft.component == "auth-service"
    assert draft.trace_id == "tr-112233"
    assert draft.timestamp is not None
    assert "rate limit exceeded" in draft.message


def test_multiline_stack_trace_grouping():
    log_content = """2026-10-14 10:20:00.000 [ERROR] [checkout-api] Unhandled exception processing order
Traceback (most recent call last):
  File "/app/services/checkout.py", line 42, in process_order
    db.session.execute("SELECT * FROM inventory")
  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine.py", line 120, in execute
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection pool exhausted
2026-10-14 10:20:05.000 [INFO] [checkout-api] Health check ping"""

    events, summary = log_parser.parse_log_content(log_content, "checkout.log")
    assert len(events) == 2  # The error + multiline traceback grouped into 1, then health check is 2nd
    assert events[0]["log_level"] == "ERROR"
    assert events[0]["is_error"] is True
    assert events[0]["stack_trace"] is not None
    assert "OperationalError" in events[0]["stack_trace"]
    assert "connection pool exhausted" in events[0]["stack_trace"]
    assert events[1]["log_level"] == "INFO"
    assert events[1]["is_error"] is False
    assert summary["error_events_count"] == 1


def test_redaction_during_parsing():
    mock_key = "sk_" + "live_" + "1234567890abcdefghijklmn"
    log_content = f'2026-10-14 10:25:00.000 [ERROR] [worker] API call failed {mock_key}'
    events, summary = log_parser.parse_log_content(log_content, "secret.log")
    assert len(events) == 1
    assert mock_key not in events[0]["message"]
    assert "[REDACTED_STRIPE_KEY]" in events[0]["message"]
    assert summary["redaction_count"] == 1
