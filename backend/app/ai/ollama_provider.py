"""Local Ollama AI Provider for NoBugs AI"""
import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.ai.base import AIProvider, AIConnectionError, AISchemaValidationError
from app.schemas.health import AIHealthResponse
from app.schemas.ai_analysis import IncidentAIAnalysisContract

logger = logging.getLogger(__name__)

OLLAMA_SETUP_GUIDE = (
    "To use local open-weight AI inference with Ollama:\n"
    "1. Install Ollama: brew install ollama (macOS) or download from https://ollama.com\n"
    "2. Start Ollama: Run 'ollama serve' in a terminal\n"
    f"3. Pull model: Run 'ollama pull {settings.OLLAMA_MODEL}'\n"
    f"4. Verify: Ensure {settings.OLLAMA_BASE_URL} is accessible"
)


class OllamaAIProvider(AIProvider):
    """Integrates with local Ollama daemon for open-weight model inference"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS

    @property
    def name(self) -> str:
        return "ollama"

    async def check_health(self) -> AIHealthResponse:
        """Check Ollama service status and available pulled models"""
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    # Check if requested model or base prefix matches
                    target_model = self.model
                    base_target = target_model.split(":")[0]
                    model_found = any(
                        m == target_model or m.startswith(f"{base_target}:") or m == base_target
                        for m in models
                    )

                    if not model_found:
                        return AIHealthResponse(
                            status="connected",
                            provider=self.name,
                            endpoint=self.base_url,
                            model=self.model,
                            model_available=False,
                            available_models=models,
                            error_message=(
                                f"Ollama is running, but model '{self.model}' is not pulled. "
                                f"Available: {models or 'None'}"
                            ),
                            setup_instructions=f"Run in terminal: ollama pull {self.model}",
                            is_mock_fallback_active=settings.ALLOW_OFFLINE_MOCK_FALLBACK,
                        )

                    return AIHealthResponse(
                        status="connected",
                        provider=self.name,
                        endpoint=self.base_url,
                        model=self.model,
                        model_available=True,
                        available_models=models,
                        error_message=None,
                        setup_instructions=None,
                        is_mock_fallback_active=False,
                    )
                else:
                    return AIHealthResponse(
                        status="unavailable",
                        provider=self.name,
                        endpoint=self.base_url,
                        model=self.model,
                        model_available=False,
                        available_models=[],
                        error_message=f"Ollama returned HTTP status {response.status_code}",
                        setup_instructions=OLLAMA_SETUP_GUIDE,
                        is_mock_fallback_active=settings.ALLOW_OFFLINE_MOCK_FALLBACK,
                    )
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            logger.warning("Ollama connection failed: %s", str(e))
            return AIHealthResponse(
                status="unavailable",
                provider=self.name,
                endpoint=self.base_url,
                model=self.model,
                model_available=False,
                available_models=[],
                error_message=f"Cannot reach Ollama at {self.base_url}. Daemon is not running.",
                setup_instructions=OLLAMA_SETUP_GUIDE,
                is_mock_fallback_active=settings.ALLOW_OFFLINE_MOCK_FALLBACK,
            )
        except Exception as e:
            logger.error("Unexpected error checking Ollama health: %s", str(e))
            return AIHealthResponse(
                status="unavailable",
                provider=self.name,
                endpoint=self.base_url,
                model=self.model,
                model_available=False,
                available_models=[],
                error_message=f"Error checking Ollama: {str(e)}",
                setup_instructions=OLLAMA_SETUP_GUIDE,
                is_mock_fallback_active=settings.ALLOW_OFFLINE_MOCK_FALLBACK,
            )

    async def analyze_incident(
        self,
        incident_summary: Dict[str, Any],
        supporting_events: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
    ) -> IncidentAIAnalysisContract:
        """Execute structured root cause analysis via Ollama"""
        health = await self.check_health()
        if health.status != "connected" or not health.model_available:
            raise AIConnectionError(
                f"Ollama model {self.model} is not ready. {health.error_message or ''}\n"
                f"{health.setup_instructions or ''}"
            )

        system_prompt = (
            "You are NoBugs AI, a principal systems reliability engineer and root-cause analysis expert.\n"
            "Analyze the provided application log events and incident metadata.\n"
            "STRICT RULES:\n"
            "1. NEVER invent log lines, timestamps, trace IDs, stack traces, or fictitious events.\n"
            "2. Distinguish observed facts from hypotheses.\n"
            "3. Reference actual event IDs in supporting_event_ids.\n"
            "4. Output MUST be valid JSON adhering precisely to the required schema.\n"
            "5. If evidence is incomplete, state what is missing rather than hallucinating.\n"
            "6. Identify dangerous fixes and include verification steps."
        )

        user_content = {
            "task": "Perform incident root-cause analysis",
            "incident": incident_summary,
            "log_events": supporting_events[:40],  # Guard against prompt context explosion
            "context": context or {},
            "required_json_schema": IncidentAIAnalysisContract.model_json_schema(),
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_content, default=str)},
            ],
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for factual, deterministic analysis
                "top_p": 0.9,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                if response.status_code != 200:
                    raise AIProviderError(f"Ollama chat API returned status {response.status_code}: {response.text}")

                data = response.json()
                content_str = data.get("message", {}).get("content", "{}")
                
                # Parse and validate with Pydantic contract
                try:
                    analysis = IncidentAIAnalysisContract.model_validate_json(content_str)
                    return analysis
                except Exception as validation_err:
                    logger.error("JSON schema validation failed on Ollama response: %s", str(validation_err))
                    raise AISchemaValidationError(
                        f"Ollama output did not match IncidentAIAnalysisContract schema: {validation_err}"
                    )
        except httpx.TimeoutException:
            raise AIConnectionError(f"Ollama inference timed out after {self.timeout}s.")
        except httpx.ConnectError:
            raise AIConnectionError(f"Lost connection to Ollama at {self.base_url}.")
