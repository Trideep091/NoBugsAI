"""Abstract Base Class for AI Providers in NoBugs AI"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.schemas.health import AIHealthResponse
from app.schemas.ai_analysis import IncidentAIAnalysisContract


class AIProviderError(Exception):
    """Base exception for AI provider errors"""
    pass


class AIConnectionError(AIProviderError):
    """Raised when the AI runtime endpoint cannot be reached"""
    pass


class AISchemaValidationError(AIProviderError):
    """Raised when the AI model returns data not conforming to the strict contract"""
    pass


class AIProvider(ABC):
    """Base interface for all AI analysis runtime providers"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier name (e.g. 'ollama', 'mock_offline')"""
        pass

    @abstractmethod
    async def check_health(self) -> AIHealthResponse:
        """Verify provider endpoint availability and model readiness"""
        pass

    @abstractmethod
    async def analyze_incident(
        self,
        incident_summary: Dict[str, Any],
        supporting_events: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
    ) -> IncidentAIAnalysisContract:
        """
        Perform structured root cause analysis and return validated contract.
        
        Args:
            incident_summary: Metadata about the incident (title, severity, count, times)
            supporting_events: Sanitized log events associated with this incident
            context: Additional contextual telemetry if present
            
        Returns:
            Validated IncidentAIAnalysisContract instance
        """
        pass
