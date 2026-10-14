"""Health and Model Status Schemas"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AIHealthResponse(BaseModel):
    status: str = Field(..., description="'connected' or 'unavailable'")
    provider: str = Field(default="ollama", description="AI Provider identifier")
    endpoint: str = Field(..., description="Ollama or AI runtime endpoint URL")
    model: str = Field(..., description="Configured model name")
    model_available: bool = Field(default=False, description="Whether the specific model is downloaded and ready")
    available_models: List[str] = Field(default_factory=list, description="List of models pulled in Ollama")
    error_message: Optional[str] = Field(default=None, description="Clear description of failure if unavailable")
    setup_instructions: Optional[str] = Field(default=None, description="Actionable terminal commands to start/install Ollama")
    is_mock_fallback_active: bool = Field(default=False, description="Whether offline fallback mode is enabled for demo/testing")


class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    app_name: str
    version: str
    database: str
    ai_status: AIHealthResponse
    uptime_seconds: float
    timestamp: str
