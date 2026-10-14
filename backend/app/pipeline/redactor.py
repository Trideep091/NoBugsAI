"""Sensitive Data Detection and Redaction Module for NoBugs AI (Milestone 2)"""
import re
from typing import Tuple, List, Dict, Any, Optional

# Regular expression definitions for common secrets and credentials
SECRET_PATTERNS = [
    (
        "PRIVATE_KEY",
        re.compile(
            r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
            re.MULTILINE,
        ),
        "[REDACTED_PRIVATE_KEY]",
    ),
    (
        "AWS_ACCESS_KEY",
        re.compile(r"\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b"),
        "[REDACTED_AWS_KEY]",
    ),
    (
        "STRIPE_KEY",
        re.compile(r"\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z_-]{10,}\b"),
        "[REDACTED_STRIPE_KEY]",
    ),
    (
        "GITHUB_TOKEN",
        re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{36,}\b"),
        "[REDACTED_GITHUB_TOKEN]",
    ),
    (
        "SLACK_TOKEN",
        re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{10,}\b"),
        "[REDACTED_SLACK_TOKEN]",
    ),
    (
        "OPENAI_KEY",
        re.compile(r"\bsk-[a-zA-Z0-9_-]{20,}\b"),
        "[REDACTED_OPENAI_KEY]",
    ),
    (
        "JWT_TOKEN",
        re.compile(r"\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b"),
        "[REDACTED_JWT_TOKEN]",
    ),
    (
        "AUTHORIZATION_HEADER",
        re.compile(
            r"(?i)\b(?:Authorization|Proxy-Authorization)\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*",
        ),
        "Authorization: [REDACTED_AUTH_HEADER]",
    ),
    (
        "GENERIC_PASSWORD",
        re.compile(
            r"""(?i)["']?(?:password|passwd|pwd|secret|api_key|apikey|client_secret|access_token|auth_token)["']?\s*([:=])\s*(["']?)([^"',\s&;]{3,})\2""",
        ),
        # Handled in _replace_kv_secret
        None,
    ),
    (
        "CREDIT_CARD",
        re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"),
        "[REDACTED_CREDIT_CARD]",
    ),
]


class SensitiveDataRedactor:
    """Detects and redacts secrets before persistence, model invocation, and exports"""

    def __init__(self, custom_patterns: Optional[List[Tuple[str, str, str]]] = None):
        self.patterns = list(SECRET_PATTERNS)
        if custom_patterns:
            for name, regex_str, mask in custom_patterns:
                self.patterns.append((name, re.compile(regex_str, re.IGNORECASE), mask))

    def redact(self, text: str, line_number: int = 1) -> Tuple[str, int, List[Dict[str, Any]]]:
        """
        Redacts all sensitive patterns from text.
        
        Returns:
            Tuple of:
            - sanitized_text: text with matching secrets replaced by tokens
            - count: number of redactions made
            - detections: metadata of detected patterns (without storing the secret)
        """
        if not text:
            return text, 0, []

        sanitized = text
        total_count = 0
        detections: List[Dict[str, Any]] = []

        # 1. Generic key-value password pattern
        def _replace_kv_secret(match: re.Match) -> str:
            nonlocal total_count
            total_count += 1
            key_full = match.group(0)
            delimiter = match.group(1)
            quote = match.group(2)
            key_name = key_full.split(delimiter)[0].strip()
            detections.append({
                "pattern_name": "CREDENTIAL_FIELD",
                "masked_value": f"{key_name}{delimiter}{quote}[REDACTED_SECRET]{quote}",
                "line_number": line_number,
            })
            return f"{key_name}{delimiter}{quote}[REDACTED_SECRET]{quote}"

        # 2. Iterate compiled patterns
        for name, pattern, mask in self.patterns:
            if mask is None:
                # KV replacement
                sanitized = pattern.sub(_replace_kv_secret, sanitized)
            else:
                matches = list(pattern.finditer(sanitized))
                if matches:
                    total_count += len(matches)
                    for _ in matches:
                        detections.append({
                            "pattern_name": name,
                            "masked_value": mask,
                            "line_number": line_number,
                        })
                    sanitized = pattern.sub(mask, sanitized)

        return sanitized, total_count, detections

    def sanitize_for_spreadsheet(self, value: Any) -> Any:
        """
        Prevents CSV / Excel formula injection.
        Prefixes values starting with '=', '+', '-', or '@' with a single apostrophe.
        """
        if isinstance(value, str) and value:
            # If string starts with formula characters, neutralize it
            if value[0] in ("=", "+", "-", "@", "\t", "\r"):
                return f"'{value}"
        return value


# Default singleton redactor
redactor = SensitiveDataRedactor()
