"""Unit Tests for Sensitive Data Redaction (Milestone 2)"""
import pytest
from app.pipeline.redactor import redactor, SensitiveDataRedactor


def test_redact_aws_key():
    # Split token to prevent GitHub push protection false-positive static detection
    mock_aws_key = "AK" + "IA1234567890ABCDEF"
    text = f"Failed to upload S3 bucket with access key {mock_aws_key} to us-east-1"
    sanitized, count, detections = redactor.redact(text)
    assert mock_aws_key not in sanitized
    assert "[REDACTED_AWS_KEY]" in sanitized
    assert count == 1
    assert detections[0]["pattern_name"] == "AWS_ACCESS_KEY"


def test_redact_stripe_key():
    # Split token to prevent GitHub push protection false-positive static detection
    mock_stripe_key = "sk_" + "live_" + "51Abcdefghijklmnopqrstuvwx"
    text = f"Stripe charge error with key {mock_stripe_key}"
    sanitized, count, detections = redactor.redact(text)
    assert mock_stripe_key not in sanitized
    assert "[REDACTED_STRIPE_KEY]" in sanitized
    assert count == 1


def test_redact_authorization_header():
    text = "Request headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature"
    sanitized, count, detections = redactor.redact(text)
    assert "doNotLeakThisSignature" not in sanitized
    assert "[REDACTED" in sanitized
    assert count >= 1


def test_redact_password_field():
    text = 'Database error: {"host": "10.0.0.1", "password": "superSecretPassword123!", "user": "admin"}'
    sanitized, count, detections = redactor.redact(text)
    assert "superSecretPassword123!" not in sanitized
    assert "[REDACTED_SECRET]" in sanitized
    assert count == 1


def test_redact_private_key_pem():
    pem_head = "-----BEGIN " + "RSA PRIVATE KEY-----"
    pem_foot = "-----END " + "RSA PRIVATE KEY-----"
    text = f"Server startup error:\n{pem_head}\nMIIEowIBAAKCAQEA0mY8v...\nMIICXAIBAAKCAQEAw...\n{pem_foot}\nFailed to bind TLS listener."
    sanitized, count, detections = redactor.redact(text)
    assert "MIIEowIBAAKCAQEA0mY8v" not in sanitized
    assert "[REDACTED_PRIVATE_KEY]" in sanitized
    assert count == 1


def test_formula_injection_sanitization():
    """Verify spreadsheet formula injection protection"""
    assert redactor.sanitize_for_spreadsheet("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert redactor.sanitize_for_spreadsheet("+12345") == "'+12345"
    assert redactor.sanitize_for_spreadsheet("-12345") == "'-12345"
    assert redactor.sanitize_for_spreadsheet("@cmd|'/C calc'!A0") == "'@cmd|'/C calc'!A0"
    assert redactor.sanitize_for_spreadsheet("Normal Text") == "Normal Text"
