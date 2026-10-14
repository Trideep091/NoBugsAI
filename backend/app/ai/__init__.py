"""AI Provider Module Factory"""
from app.config import settings
from app.ai.base import AIProvider
from app.ai.ollama_provider import OllamaAIProvider
from app.ai.mock_provider import MockOfflineAIProvider


def get_ai_provider(name: str = "ollama") -> AIProvider:
    """Return an AI provider instance by name"""
    if name == "mock_offline":
        return MockOfflineAIProvider()
    return OllamaAIProvider()


async def get_active_ai_provider(provider_preference: str = "auto") -> AIProvider:
    """
    Returns the appropriate AI provider.
    - If 'ollama': returns Ollama provider
    - If 'mock_offline': returns MockOffline provider
    - If 'auto': checks Ollama; if reachable and ready, uses Ollama; otherwise if fallback allowed, uses mock.
    """
    if provider_preference == "mock_offline":
        return MockOfflineAIProvider()
    if provider_preference == "ollama":
        return OllamaAIProvider()

    # Auto mode:
    ollama = OllamaAIProvider()
    health = await ollama.check_health()
    if health.status == "connected" and health.model_available:
        return ollama

    if settings.ALLOW_OFFLINE_MOCK_FALLBACK:
        return MockOfflineAIProvider()

    return ollama
