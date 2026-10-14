"""Unit and Integration Tests for Health and AI Availability (Milestone 0)"""
import pytest
from app.ai.ollama_provider import OllamaAIProvider
from app.ai.mock_provider import MockOfflineAIProvider


def test_root_endpoint(client):
    """Test root endpoint returns application metadata"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "NoBugs AI"
    assert "api_health" in data


def test_health_endpoint(client):
    """Test /api/health endpoint returns status, db health, and AI readiness"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "degraded"]
    assert data["database"] == "healthy"
    assert "ai_status" in data
    assert "uptime_seconds" in data
    assert data["app_name"] == "NoBugs AI"


def test_ai_health_endpoint(client):
    """Test /api/health/ai returns clear status and instructions"""
    response = client.get("/api/health/ai")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "provider" in data
    assert "endpoint" in data
    assert "model" in data
    # When Ollama daemon is offline, error_message and setup_instructions must be present
    if data["status"] == "unavailable":
        assert data["error_message"] is not None
        assert "ollama" in data["setup_instructions"].lower()
        assert data["is_mock_fallback_active"] is True


@pytest.mark.asyncio
async def test_ollama_offline_behavior():
    """Verify Ollama provider gracefully handles unreachable daemon without crashing"""
    provider = OllamaAIProvider(base_url="http://127.0.0.1:99999")  # Unreachable port
    health = await provider.check_health()
    assert health.status == "unavailable"
    assert health.model_available is False
    assert health.error_message is not None
    assert "Cannot reach Ollama" in health.error_message or "Error" in health.error_message
    assert health.setup_instructions is not None


@pytest.mark.asyncio
async def test_mock_offline_provider():
    """Verify MockOfflineAIProvider reports healthy fallback status"""
    provider = MockOfflineAIProvider()
    health = await provider.check_health()
    assert health.status == "connected"
    assert health.model_available is True
    assert health.is_mock_fallback_active is True
