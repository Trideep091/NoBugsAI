# NoBugs AI — Architectural Specification

## 1. System Overview

**NoBugs AI** is an AI-powered log investigation and root-cause analysis platform designed to help software engineers move rapidly from unstructured, multi-service application log files to evidence-backed incident diagnoses, root-cause hypotheses, and problem-specific remediation plans.

```
                                      +------------------------------------+
                                      |          Log Sources               |
                                      |  (.log / .txt / JSON / Paste Editor)|
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |    Sensitive-Data Redactor         |
                                      | (Masks API keys, JWT, PII, Secrets)|
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |       Modular Log Parser           |
                                      | (Timestamp, Level, TraceID, Stacks)|
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |    Error & Anomaly Detector        |
                                      |  (Signatures, Exception Types)     |
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |   Incident Correlation Engine      |
                                      | (TraceIDs, Time Windows, Cascades) |
                                      +-----------------+------------------+
                                                        |
                                                        v
                       +--------------------------------+--------------------------------+
                       |                                                                 |
                       v                                                                 v
+----------------------+----------------------+                   +----------------------+----------------------+
|       Severity & Lifecycle Manager           |                   |     AI Root-Cause Analysis Service   |
| (Critical / High / Mild Safety Rules)        |                   | (Local Ollama LLM + Schema Guardrail)|
+----------------------+----------------------+                   +----------------------+----------------------+
                       |                                                                 |
                       +--------------------------------+--------------------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |      Persistence Layer             |
                                      | (SQLite / PostgreSQL Migration Path)|
                                      +-----------------+------------------+
                                                        |
                                                        v
                         +------------------------------+------------------------------+
                         |                                                             |
                         v                                                             v
+------------------------+------------------------+           +------------------------+------------------------+
|          Interactive Web Dashboard              |           |        Formatted Excel Export Engine           |
| (React, TypeScript, Vite, Tailwind, Recharts)   |           |  (OpenPyXL 3-Sheet Workbook + Formula Safety)  |
+-------------------------------------------------+           +------------------------------------------------+
```

---

## 2. Core Processing Pipeline

### Stage 1: Ingestion and Sanitization
- Supports multi-file uploads and raw copy-paste logs up to 10MB per session.
- Immediate deterministic secret redaction masks credentials (AWS keys, OpenAI tokens, Stripe keys, GitHub tokens, passwords, JWT tokens, PEM keys) *before* persistence or AI model invocation.
- Preserves original line numbering while substituting sensitive values with audit tokens (`[REDACTED_AWS_KEY]`, `[REDACTED_SECRET]`).

### Stage 2: Modular Parsing & Stack Trace Grouping
- Recognizes multiple timestamp formats: ISO8601 (`2026-10-14T10:00:00Z`), RFC2822, Syslog (`Oct 14 10:00:00`), and HTTP Common/Combined log format.
- Normalized log levels into standard taxonomy (`CRITICAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`).
- Multi-line traceback grouping: consecutive indentation and traceback frames (`Traceback...`, `File...`, `at com.nobugs...`) are bundled into the initiating parent event instead of becoming fragmented orphan events.
- Preserves malformed lines and reports them transparently.

### Stage 3: Error Detection & Fingerprinting
- Fingerprints error templates by stripping variable values (UUIDs, IP addresses, memory addresses, timestamps, numeric IDs).
- Classifies canonical failure types (`DatabasePoolExhaustion`, `OutOfMemoryError`, `AuthenticationError`, `HTTPError`, `TimeoutError`, `SSLError`).

### Stage 4: Incident Correlation & Cascading Discovery
- Correlates events across disparate services using:
  1. Distributed `trace_id` / `request_id`
  2. Temporal proximity within sliding observation windows (60–180 seconds)
  3. Cascading cause-and-effect heuristics (e.g. Database connection pool exhaustion at 09:30:12 followed by upstream API Gateway 504 Timeouts at 09:30:20).
- Distinguishes primary initiating events from downstream symptoms (`CAUSED_BY`, `SYMPTOM_OF`).

### Stage 5: AI Root-Cause Analysis with Strict Output Schema
- Dispatches incident context (sanitized events, component names, timestamps) to a local open-weight instruction model via Ollama.
- Enforces strict JSON Schema validation (`IncidentAIAnalysisContract`).
- **Anti-Hallucination Guardrail**: Verifies that every ID in `supporting_event_ids` belongs to actual observed events in the database. Any invented IDs are stripped automatically.
- Explains uncertainty, missing evidence, alternative hypotheses, and verification steps.

---

## 3. Data Model Schema

- **LogFile**: Tracks metadata, total line counts, parsed event counts, redaction counts, time boundaries.
- **LogEvent**: Stores individual line records, timestamps, components, sanitized message, stack traces, trace IDs, and error flags.
- **Incident**: Correlated failure entity with severity (`Critical`, `High`, `Mild`), lifecycle status (`Open`, `Investigating`, `Resolved`, `Reopened`), root-cause hypothesis, recommendations, and evidence references.
- **AIAnalysis**: Historical log of model inference executions, prompt configurations, and raw structured responses.
- **IncidentRelationship**: Directed causal or co-occurrence relationships between events.

---

## 4. Future Extension: Live Log Monitoring

The platform architecture is designed to support live continuous log monitoring in subsequent releases:
1. **WebSocket Ingestion Stream**: An asynchronous log streamer interface to append new lines in real time.
2. **Sliding-Window Correlator**: Incremental incident grouping that matches newly arriving events against active open incidents within a rolling time window.
3. **Reactive Re-Analysis**: Automatic triggering of AI diagnosis when an incident's occurrence rate surges or when new downstream components are impacted.
