# NoBugs AI — Evaluation & Reliability Benchmark Results

**Date**: 2026-10-14  
**Benchmark Suite**: NoBugs AI Evaluation Suite v1.0  
**Overall Accuracy**: 100.0% (4/4 passed)

## Summary Table

| Case ID | Scenario | Status | Errors Detected | Severity Accuracy | Secret Redaction | Anti-Hallucination Rate |
|---|---|---|---|---|---|---|
| `eval-case-01` | **postgres_pool** | ✅ PASS | 7 (min: 5) | ✅ Match (`Critical`) | ✅ 100% Clean | ✅ 0 Hallucinations |
| `eval-case-02` | **microservices_cascade** | ✅ PASS | 5 (min: 4) | ✅ Match (`High`) | ✅ 100% Clean | ✅ 0 Hallucinations |
| `eval-case-03` | **oom_crash** | ✅ PASS | 2 (min: 2) | ✅ Match (`Critical`) | ✅ 100% Clean | ✅ 0 Hallucinations |
| `eval-case-04` | **webhook_crypto** | ✅ PASS | 3 (min: 2) | ✅ Match (`High`) | ✅ 100% Clean | ✅ 0 Hallucinations |

## Evaluation Dimensions

1. **Error Detection & Anomaly Precision**: Evaluates whether true exceptions, connection pool failures, and gateway timeouts are captured without missing real failures.
2. **Correlation & Cascading Linkage**: Validates that initiating causes (e.g. database pool exhaustion) correctly group with downstream symptoms (e.g. 504 Gateway Timeouts).
3. **Severity Classification**: Ensures safety rules correctly promote data-loss or outage risks to `Critical` while preserving `High` and `Mild` ratings.
4. **Anti-Hallucination & Evidence Traceability**: Asserts that 100% of event IDs in `supporting_event_ids` originate from actual observed log events.
5. **Zero-Leak Secret Redaction**: Confirms that API keys, passwords, bearer tokens, and credentials never appear in plain text in persistent storage or export models.
