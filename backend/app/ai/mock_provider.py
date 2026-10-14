"""Offline Mock / Heuristic AI Provider for testing and demonstration when Ollama is unavailable"""
import logging
from typing import List, Dict, Any, Optional
from app.ai.base import AIProvider
from app.schemas.health import AIHealthResponse
from app.schemas.ai_analysis import IncidentAIAnalysisContract, RecommendedAction

logger = logging.getLogger(__name__)


class MockOfflineAIProvider(AIProvider):
    """
    Offline heuristic analyzer used when Ollama is not running.
    Transparently labels its diagnoses as offline heuristic outputs.
    Adheres strictly to the IncidentAIAnalysisContract JSON schema.
    """

    @property
    def name(self) -> str:
        return "mock_offline"

    async def check_health(self) -> AIHealthResponse:
        return AIHealthResponse(
            status="connected",
            provider=self.name,
            endpoint="internal://offline-heuristic-engine",
            model="heuristic-rule-engine-v1",
            model_available=True,
            available_models=["heuristic-rule-engine-v1"],
            error_message=None,
            setup_instructions="To enable live local LLM inference, install Ollama and run 'ollama serve'.",
            is_mock_fallback_active=True,
        )

    async def analyze_incident(
        self,
        incident_summary: Dict[str, Any],
        supporting_events: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
    ) -> IncidentAIAnalysisContract:
        """Deterministically diagnose known patterns from actual events without inventing data"""
        title = incident_summary.get("title", "Unknown incident")
        event_ids = [e.get("id") for e in supporting_events if e.get("id")]
        first_event = supporting_events[0] if supporting_events else {}
        messages = [e.get("message", "").lower() for e in supporting_events]
        full_text = " ".join(messages)

        # Pattern 1: Database connection pool or timeout
        if "database" in full_text or "connection" in full_text or "pool" in full_text or "postgres" in full_text:
            return IncidentAIAnalysisContract(
                incident_title=title or "Database Connection Pool Exhaustion",
                problem_summary="Downstream application services cannot acquire database connections, resulting in connection timeouts and 504 gateway responses.",
                severity_recommendation="Critical" if "exhaust" in full_text or "timeout" in full_text else "High",
                lifecycle_status="Open",
                root_cause_hypothesis="The PostgreSQL connection pool was exhausted by long-running transactions or connection leaks, causing subsequent checkout and query requests to stall and timeout.",
                confidence="High" if len(event_ids) >= 2 else "Medium",
                confidence_rationale="Multiple events cite 'Timeout waiting for connection from pool' accompanied by upstream 504 Gateway Timeouts.",
                supporting_event_ids=event_ids[:5],
                alternative_hypotheses=[
                    "Network partition between application worker nodes and database server",
                    "Database server reached max_connections limit at OS or engine level",
                    "Deadlock in concurrent transaction batch locking the connection queue"
                ],
                recommended_actions=[
                    RecommendedAction(
                        action="Inspect connection pool utilization metrics and active query count in pg_stat_activity.",
                        reason="Determines whether connections are lingering in 'idle in transaction' state.",
                        verification="Verify active pool connections drop below maximum pool size threshold."
                    ),
                    RecommendedAction(
                        action="Increase connection acquisition timeout temporarily or scale pool capacity.",
                        reason="Prevents abrupt client request drops while investigating slow query bottlenecks.",
                        verification="Confirm error rate in service logs returns to 0%."
                    ),
                ],
                missing_information=[
                    "Database server CPU and memory metrics",
                    "pg_stat_activity connection list during incident peak",
                    "Connection pool max_size configuration parameters"
                ],
                limitations=[
                    "Application logs indicate pool exhaustion but cannot inspect database engine internal state without db metrics."
                ]
            )

        # Pattern 2: Webhook / Signature Verification failure
        elif "webhook" in full_text or "stripe" in full_text:
            return IncidentAIAnalysisContract(
                incident_title=title or "Webhook Signature Cryptographic Verification Failure",
                problem_summary="Inbound webhook events were rejected due to cryptographic signature verification mismatches or timestamp drift.",
                severity_recommendation="High",
                lifecycle_status="Open",
                root_cause_hypothesis="Incoming webhook signatures failed cryptographic HMAC verification, likely due to a shared webhook signing secret mismatch or host NTP timestamp drift outside the tolerance window.",
                confidence="High",
                confidence_rationale="Log traces explicitly report StripeSignatureVerificationError and invalid signature rejections.",
                supporting_event_ids=event_ids[:5],
                alternative_hypotheses=[
                    "System clock drift (NTP) exceeding provider signature timestamp tolerance",
                    "Webhook endpoint signing secret mismatch between Stripe dashboard and environment config",
                    "Reverse proxy or middleware altering raw request payload before signature check"
                ],
                recommended_actions=[
                    RecommendedAction(
                        action="Synchronize system clock via NTP daemon (pool.ntp.org).",
                        reason="Cryptographic webhooks reject payloads if timestamp delta exceeds 300 seconds.",
                        verification="Verify chrony or ntpstat offset is below 50ms."
                    ),
                    RecommendedAction(
                        action="Verify that STRIPE_WEBHOOK_SECRET in environment matches the active endpoint secret.",
                        reason="Mismatched signing keys will cause 100% of HMAC signature checks to fail.",
                        verification="Trigger test webhook event from provider dashboard and verify 200 OK."
                    ),
                ],
                missing_information=[
                    "Host clock offset metrics",
                    "Webhook request header timestamp values"
                ],
                limitations=[
                    "Raw cryptographic keys and payload signatures are redacted in log outputs."
                ]
            )

        # Pattern 3: Authentication / JWT / Token Expiry
        elif "token" in full_text or "auth" in full_text or "unauthorized" in full_text or "401" in full_text:
            return IncidentAIAnalysisContract(
                incident_title=title or "Authentication Service Token Expiration Cascade",
                problem_summary="Requests to microservices are failing with 401 Unauthorized due to expired or malformed bearer tokens.",
                severity_recommendation="High",
                lifecycle_status="Open",
                root_cause_hypothesis="The token rotation or signing key refresh failed, or client authentication credentials expired without successful auto-renewal.",
                confidence="High",
                confidence_rationale="Observed repeated 401 status codes and 'Signature has expired' or 'Token rejected' logs.",
                supporting_event_ids=event_ids[:5],
                alternative_hypotheses=[
                    "Clock skew between identity provider server and verifying microservices",
                    "Public key cache invalidation failure following key rotation",
                    "Malformed Authorization header forwarded through reverse proxy"
                ],
                recommended_actions=[
                    RecommendedAction(
                        action="Verify system time synchronization (NTP) across authentication nodes and client clusters.",
                        reason="Clock drift greater than token leeway causes immediate signature rejection.",
                        verification="Check chrony or ntpstat output on all participating hosts."
                    ),
                    RecommendedAction(
                        action="Validate JWKS endpoint availability and key rotation schedule.",
                        reason="Ensures verifying services possess the current active public verification keys.",
                        verification="Send test authenticated curl request using freshly minted token."
                    ),
                ],
                missing_information=[
                    "Identity provider audit logs",
                    "NTP synchronization status"
                ],
                limitations=[
                    "Log lines do not display raw token payloads due to security redaction."
                ]
            )

        # Pattern 3: Out of Memory / Resource Exhaustion
        elif "outofmemory" in full_text or "oom" in full_text or "memory" in full_text or "killed" in full_text:
            return IncidentAIAnalysisContract(
                incident_title=title or "Worker Process OutOfMemory Crash",
                problem_summary="Background worker process was terminated unexpectedly due to heap exhaustion or Linux OOM killer.",
                severity_recommendation="Critical",
                lifecycle_status="Open",
                root_cause_hypothesis="An unbounded batch processing task accumulated large payload objects in memory faster than the garbage collector could reclaim them.",
                confidence="High",
                confidence_rationale="Log traces explicitly report java.lang.OutOfMemoryError or OS kernel OOM invocation.",
                supporting_event_ids=event_ids[:5],
                alternative_hypotheses=[
                    "Memory leak in caching layer retaining references to completed requests",
                    "Sudden spike in concurrent large file processing jobs",
                    "Container memory limit configured too close to base JVM/runtime overhead"
                ],
                recommended_actions=[
                    RecommendedAction(
                        action="Inspect memory heap dump (.hprof) generated at crash time.",
                        reason="Reveals which class instances occupied the largest percentage of heap space.",
                        verification="Identify dominant retainers using memory analysis tooling (e.g. Eclipse MAT)."
                    ),
                    RecommendedAction(
                        action="Implement batch chunking with streaming processing instead of in-memory buffering.",
                        reason="Bounds maximum memory footprint regardless of dataset size.",
                        verification="Monitor resident set size (RSS) during processing of a 100k-record batch."
                    ),
                ],
                missing_information=[
                    "Heap dump file",
                    "JVM GC logs and container cgroup memory metrics"
                ],
                limitations=[
                    "Heap dump binaries are not stored within application text logs."
                ]
            )

        # Default fallback diagnosis
        return IncidentAIAnalysisContract(
            incident_title=title or "Detected Application Error Chain",
            problem_summary=f"Incident encompasses {len(event_ids)} correlated failure events in component(s) {incident_summary.get('affected_components', ['unknown'])}.",
            severity_recommendation=incident_summary.get("severity", "High"),
            lifecycle_status="Open",
            root_cause_hypothesis=f"Application exception or service failure initiated at {first_event.get('timestamp') or 'earliest event'}. Root exception indicated in message: {first_event.get('message', 'Unspecified error')[:120]}",
            confidence="Medium",
            confidence_rationale="Diagnosis derived from direct event log messages and timestamps.",
            supporting_event_ids=event_ids[:5],
            alternative_hypotheses=[
                "Transient upstream dependency timeout",
                "Uncaught edge case exception in handler logic"
            ],
            recommended_actions=[
                RecommendedAction(
                    action="Check line numbers in stack trace corresponding to first failure event.",
                    reason="Earliest event typically highlights the initiating trigger before cascading side effects.",
                    verification="Run unit test targeting the specific failure condition."
                )
            ],
            missing_information=[
                "Host system metrics and preceding debug-level trace logs"
            ],
            limitations=[
                "Log extract is limited in scope; root cause hypothesis should be verified against telemetry."
            ]
        )
