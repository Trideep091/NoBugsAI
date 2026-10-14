# NoBugs AI — Evaluation Framework and Reliability Benchmarks

## Overview

NoBugs AI includes an automated, reproducible evaluation framework (`evaluations/benchmark_runner.py`) that tests system accuracy against ground-truth incident datasets (`evaluations/eval_dataset.json`).

---

## Evaluation Criteria

1. **Error Detection Precision & Recall**:
   - Asserts that true operational failures, connection timeouts, and memory crashes are accurately detected without false negatives.
2. **Incident Correlation & Cascading Accuracy**:
   - Verifies that initiating triggers (e.g. database pool exhaustion) group with downstream symptoms (e.g. 504 Gateway Timeouts) across multi-service architectures.
3. **Severity Classification Safety**:
   - Confirms that high-risk incidents (OOM, Pool Exhaustion) are prioritized as `Critical`, while feature impairments are assigned `High`.
4. **Anti-Hallucination & Evidence Traceability**:
   - Verifies that 100% of IDs in `supporting_event_ids` link to real, observed log events in the database.
5. **Zero-Leak Secret Redaction**:
   - Asserts that sensitive tokens, passwords, and private keys never appear in plain text in database records or exported reports.

---

## Running the Benchmark

```bash
# Execute automated benchmark evaluation
./backend/venv/bin/python evaluations/benchmark_runner.py
```

### Benchmark Results Summary (v1.0)

| Scenario | Primary Root Cause | Errors Detected | Severity Accuracy | Secret Redaction | Anti-Hallucination |
|---|---|---|---|---|---|
| **PostgreSQL Pool Exhaustion** | Connection Pool Exhaustion | 7 / 5 min | ✅ Match (`Critical`) | ✅ 100% Redacted | ✅ 0 Hallucinations |
| **Microservices Auth Cascade** | Token Expiry / Key Rotation | 5 / 4 min | ✅ Match (`High`) | ✅ 100% Redacted | ✅ 0 Hallucinations |
| **Worker OOM Crash** | Unbounded Batch Memory Exhaustion | 2 / 2 min | ✅ Match (`Critical`) | ✅ 100% Redacted | ✅ 0 Hallucinations |
| **Stripe Webhook Drift** | Signature Timestamp Verification Drift | 3 / 2 min | ✅ Match (`High`) | ✅ 100% Redacted | ✅ 0 Hallucinations |

**Overall Score**: **100.0% Pass Rate (4/4 test cases)**
