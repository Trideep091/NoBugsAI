"""AI Response Contract and Analysis Schemas"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class RecommendedAction(BaseModel):
    action: str = Field(..., description="Actionable debugging or remediation step")
    reason: str = Field(..., description="Technical justification linking action to observed log evidence")
    verification: str = Field(..., description="Step to verify whether this action resolved the issue")


class IncidentAIAnalysisContract(BaseModel):
    incident_title: str = Field(..., description="Concise, technical title of the incident")
    problem_summary: str = Field(..., description="Factual summary of the detected failure")
    severity_recommendation: Literal["Critical", "High", "Mild"] = Field(..., description="Recommended incident severity")
    lifecycle_status: Literal["Open", "Investigating", "Resolved", "Reopened"] = Field(default="Open", description="Incident lifecycle status")
    root_cause_hypothesis: str = Field(..., description="Evidence-backed hypothesis of the underlying failure")
    confidence: Literal["High", "Medium", "Low"] = Field(..., description="Confidence level in the hypothesis")
    confidence_rationale: str = Field(..., description="Transparent reasoning explaining why confidence is High/Medium/Low")
    supporting_event_ids: List[str] = Field(default_factory=list, description="IDs of actual observed log events that serve as evidence")
    alternative_hypotheses: List[str] = Field(default_factory=list, description="Alternative plausible explanations to consider")
    recommended_actions: List[RecommendedAction] = Field(default_factory=list, description="Incident-specific debugging and remediation steps")
    missing_information: List[str] = Field(default_factory=list, description="Missing telemetry or logs that would clarify diagnosis")
    limitations: List[str] = Field(default_factory=list, description="Known limitations of this diagnosis")


class AIAnalysisRequest(BaseModel):
    incident_id: str
    force_refresh: bool = False
    provider_override: Optional[str] = None  # None = use configured provider
