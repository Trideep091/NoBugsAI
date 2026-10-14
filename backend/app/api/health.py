"""Health Check and AI Status API Routes"""
import time
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.db.session import get_db
from app.ai.ollama_provider import OllamaAIProvider
from app.schemas.health import HealthResponse, AIHealthResponse

router = APIRouter(prefix="/health", tags=["Health"])

START_TIME = time.time()


@router.get("", response_model=HealthResponse)
async def get_health(db: Session = Depends(get_db)):
    """System overall health check including database and AI status"""
    # 1. Database check
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # 2. AI runtime check
    ollama = OllamaAIProvider()
    ai_status = await ollama.check_health()

    uptime = round(time.time() - START_TIME, 2)
    current_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

    overall_status = "ok" if db_status == "healthy" else "degraded"

    return HealthResponse(
        status=overall_status,
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        database=db_status,
        ai_status=ai_status,
        uptime_seconds=uptime,
        timestamp=current_ts,
    )


@router.get("/ai", response_model=AIHealthResponse)
async def get_ai_status():
    """Specific health and model availability check for local Ollama runtime"""
    ollama = OllamaAIProvider()
    return await ollama.check_health()


@router.post("/ai/test")
async def test_ai_completion():
    """Test AI provider response with a small diagnostic check"""
    ollama = OllamaAIProvider()
    health = await ollama.check_health()
    
    if health.status != "connected" or not health.model_available:
        return {
            "success": False,
            "provider": "ollama",
            "message": "Ollama local inference runtime is currently unavailable.",
            "details": health.error_message,
            "instructions": health.setup_instructions,
            "fallback_available": settings.ALLOW_OFFLINE_MOCK_FALLBACK,
        }

    return {
        "success": True,
        "provider": "ollama",
        "message": f"Ollama model '{ollama.model}' is available and responding.",
        "endpoint": ollama.base_url,
    }
