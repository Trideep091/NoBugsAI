"""Automatic Error Detection and Event Classification Engine (Milestone 3)"""
import re
import hashlib
from typing import Optional, Tuple, Dict, Any, List

# Regex to normalize variable values for stable signature generation
UUID_REGEX = re.compile(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", re.IGNORECASE)
HEX_ADDR_REGEX = re.compile(r"0x[a-f0-9]+", re.IGNORECASE)
NUMBER_REGEX = re.compile(r"\b\d+(?:\.\d+)?(?:ms|ns|us|s|m|h|kb|mb|gb)?\b", re.IGNORECASE)
IP_REGEX = re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b")

# Well-known technical exception types
EXCEPTION_PATTERNS = [
    (re.compile(r"(?i)\b(?:OutOfMemoryError|MemoryError|OOMKilled|heap space)\b"), "OutOfMemoryError"),
    (re.compile(r"(?i)\b(?:OperationalError|connection pool exhausted|max_connections|pool timeout)\b"), "DatabasePoolExhaustion"),
    (re.compile(r"(?i)\b(?:ConnectionRefusedError|ECONNREFUSED|connection refused)\b"), "ConnectionRefused"),
    (re.compile(r"(?i)\b(?:TimeoutError|ETIMEDOUT|timed? ?out|504 Gateway Timeout|deadline exceeded)\b"), "TimeoutError"),
    (re.compile(r"(?i)\b(?:Unauthorized|401 Unauthorized|token expired|signature has expired|signature verification failed|SignatureVerificationError|invalid signature|invalid token)\b"), "AuthenticationError"),
    (re.compile(r"(?i)\b(?:PermissionDenied|403 Forbidden|access denied)\b"), "AuthorizationError"),
    (re.compile(r"(?i)\b(?:SSLError|CertificateError|TLS handshake failed|handshake_failure)\b"), "SSLError"),
    (re.compile(r"(?i)\b(?:DeadlockDetected|Lock wait timeout|deadlock detected)\b"), "DatabaseDeadlock"),
    (re.compile(r"(?i)\b(?:NullPointerException|TypeError|AttributeError|KeyError|IndexError|ValueError)\b"), "RuntimeCodeException"),
    (re.compile(r"(?i)\b(?:500 Internal Server Error|502 Bad Gateway|503 Service Unavailable)\b"), "HTTPError"),
    (re.compile(r"(?i)\b(?:rate limit exceeded|429 Too Many Requests)\b"), "RateLimitExceeded"),
]


class ErrorDetector:
    """Detects, classifies, and fingerprints application failures in logs"""

    def normalize_message_for_signature(self, message: str) -> str:
        """Strip variable parameters (UUIDs, numbers, IPs, hex addresses) to extract template"""
        norm = UUID_REGEX.sub("<UUID>", message)
        norm = IP_REGEX.sub("<IP>", norm)
        norm = HEX_ADDR_REGEX.sub("<HEX>", norm)
        norm = NUMBER_REGEX.sub("<NUM>", norm)
        # Collapse whitespace
        norm = re.sub(r"\s+", " ", norm).strip().lower()
        return norm

    def compute_signature(self, message: str, stack_trace: Optional[str] = None, component: Optional[str] = None) -> str:
        """Generates a consistent hash fingerprint for grouping exact and template duplicates"""
        norm_msg = self.normalize_message_for_signature(message)
        comp = (component or "").strip().lower()

        # If stack trace exists, extract top 2 frames
        stack_key = ""
        if stack_trace:
            stack_lines = [line.strip() for line in stack_trace.splitlines() if line.strip()]
            top_frames = [l for l in stack_lines if l.startswith(('File "', "at "))][:2]
            stack_key = "|".join(top_frames)

        raw_key = f"{comp}::{norm_msg}::{stack_key}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:16]

    def classify_event(
        self,
        log_level: str,
        message: str,
        stack_trace: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Determines if event is an actionable error or anomaly, and returns error classification type.
        
        Returns:
            Tuple of (is_error: bool, error_type: Optional[str])
        """
        is_err = log_level.upper() in ("ERROR", "CRITICAL", "FATAL", "SEVERE") or bool(stack_trace)

        detected_type: Optional[str] = None
        full_text = f"{message} {stack_trace or ''}"

        for pattern, type_name in EXCEPTION_PATTERNS:
            if pattern.search(full_text):
                detected_type = type_name
                is_err = True
                break

        if not detected_type and is_err:
            detected_type = "GenericApplicationError"

        return is_err, detected_type

    def enrich_events(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Compute signatures and error classifications across all events"""
        for event in events:
            is_err, err_type = self.classify_event(
                log_level=event.get("log_level", "INFO"),
                message=event.get("message", ""),
                stack_trace=event.get("stack_trace"),
            )
            event["is_error"] = is_err
            event["error_type"] = err_type
            event["signature"] = self.compute_signature(
                message=event.get("message", ""),
                stack_trace=event.get("stack_trace"),
                component=event.get("component"),
            )
        return events


error_detector = ErrorDetector()
