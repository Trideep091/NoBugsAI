"""End-to-End API Integration Tests"""
import pytest
from app.db.models import IncidentModel


def test_full_api_ingestion_and_investigation_lifecycle(client):
    """End-to-end integration test through all API endpoints"""
    # 1. Clear data
    clear_res = client.delete("/api/logs/clear")
    assert clear_res.status_code == 200

    # 2. Paste log content with errors and secrets
    test_secret = "sk_" + "live_" + "1234567890abcdefghijklmn"
    log_payload = {
        "filename": "integration_test.log",
        "content": f"""2026-10-14 09:00:00.000 [INFO] [web-gateway] [trace_id=tr-int-01] Listening on port 8000
2026-10-14 09:05:00.000 [INFO] [auth-service] [trace_id=tr-int-01] Key {test_secret} loaded
2026-10-14 09:10:00.000 [ERROR] [checkout-api] [trace_id=tr-int-01] OperationalError: (psycopg2.OperationalError) connection pool exhausted
Traceback (most recent call last):
  File "/app/checkout.py", line 40, in run
    pool.getconn()
psycopg2.OperationalError: connection pool exhausted
2026-10-14 09:10:05.000 [ERROR] [web-gateway] [trace_id=tr-int-01] HTTP 504 Gateway Timeout on /checkout
2026-10-14 09:15:00.000 [INFO] [web-gateway] Recovery complete""",
    }

    paste_res = client.post("/api/logs/paste", json=log_payload)
    assert paste_res.status_code == 200
    paste_data = paste_res.json()
    assert paste_data["file"]["parsed_events_count"] >= 4
    assert paste_data["file"]["error_events_count"] >= 2
    assert paste_data["redacted_count"] >= 1  # Stripe key was redacted

    # 3. Query files
    files_res = client.get("/api/logs/files")
    assert files_res.status_code == 200
    assert len(files_res.json()) >= 1

    # 4. Query events
    events_res = client.get("/api/logs/events?is_error=true")
    assert events_res.status_code == 200
    events_data = events_res.json()
    assert events_data["total"] >= 2
    for ev in events_data["items"]:
        assert test_secret not in ev["message"]

    # 5. Query correlated incidents
    incidents_res = client.get("/api/incidents")
    assert incidents_res.status_code == 200
    incidents = incidents_res.json()
    assert len(incidents) >= 1
    incident_id = incidents[0]["id"]
    assert incidents[0]["severity"] in ["Critical", "High"]
    assert incidents[0]["lifecycle_status"] == "Open"

    # 6. Update lifecycle status: Open -> Investigating
    status_res = client.patch(f"/api/incidents/{incident_id}/status", json={"status": "Investigating"})
    assert status_res.status_code == 200
    assert status_res.json()["lifecycle_status"] == "Investigating"

    # 7. Trigger AI root-cause analysis with offline mock preference
    analyze_res = client.post(
        f"/api/incidents/{incident_id}/analyze",
        json={"incident_id": incident_id, "force_refresh": True, "provider_override": "mock_offline"},
    )
    assert analyze_res.status_code == 200
    analysis = analyze_res.json()
    assert analysis["root_cause_hypothesis"] is not None
    assert len(analysis["supporting_event_ids"]) >= 1
    assert len(analysis["recommended_actions"]) >= 1

    # 8. Query Timeline
    timeline_res = client.get("/api/timeline")
    assert timeline_res.status_code == 200
    tl_data = timeline_res.json()
    assert tl_data["has_data"] is True
    assert len(tl_data["buckets"]) >= 1

    # 9. Download Excel export
    export_res = client.get("/api/export/excel")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(export_res.content) > 1000  # Valid Excel file binary
