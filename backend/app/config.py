"""Application Configuration Settings"""
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "NoBugs AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = (
        "sqlite:////tmp/nobugs.db"
        if (os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
        else "sqlite:///./nobugs.db"
    )
    
    # AI Layer (Local Ollama)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2:latest"
    OLLAMA_TIMEOUT_SECONDS: float = 60.0
    ALLOW_OFFLINE_MOCK_FALLBACK: bool = True  # Allows offline testing when Ollama is not active
    
    # Ingestion & Upload limits
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10MB
    MAX_LINES_PER_FILE: int = 50000
    ALLOWED_EXTENSIONS: List[str] = [".log", ".txt", ".json", ".out"]
    
    # Redaction
    ENABLE_SECRET_REDACTION: bool = True
    CUSTOM_SECRET_PATTERNS: List[str] = []
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
