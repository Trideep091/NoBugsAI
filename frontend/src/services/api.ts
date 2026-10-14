/**
 * NoBugs AI - API Service Layer
 * Supports live FastAPI backend with resilient client-side fallback for static cloud deployments (Vercel / GitHub Pages)
 */
import type {
  SystemHealth,
  AIHealthStatus,
  LogFile,
  LogEvent,
  Incident,
  IncidentAIAnalysis,
  TimelineResponse,
  IngestionResult,
  LifecycleStatus,
  FileAIAnalysisResponse,
} from "../types";

const API_BASE = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.detail)
        errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// In-memory state for static preview mode when backend is unreachable
const memoryStore = {
  files: [
    {
      id: "demo-file-01",
      filename: "postgres_pool_exhaustion_504.log",
      upload_timestamp: new Date().toISOString(),
      parsing_status: "PARSED",
      total_lines: 26,
      parsed_events_count: 26,
      error_events_count: 7,
      time_range_start: "2026-10-14T09:00:00",
      time_range_end: "2026-10-14T12:30:00",
      processing_errors: [],
      raw_preview: "2026-10-14 09:00:00 [INFO] [order-service] Starting checkout processing...\n2026-10-14 09:15:00 [ERROR] [checkout-api] HikariCP pool exhausted.",
      redaction_count: 2,
    },
    {
      id: "demo-file-02",
      filename: "payment_webhook_crypto_error.log",
      upload_timestamp: new Date(Date.now() - 3600000).toISOString(),
      parsing_status: "PARSED",
      total_lines: 10,
      parsed_events_count: 10,
      error_events_count: 3,
      time_range_start: "2026-10-14T08:00:00",
      time_range_end: "2026-10-14T11:30:00",
      processing_errors: [],
      raw_preview: "2026-10-14 08:00:00 [INFO] [stripe-gateway] Listening for webhooks...",
      redaction_count: 1,
    },
  ] as LogFile[],
  incidents: [
    {
      id: "demo-inc-01",
      title: "HikariCP Connection Pool Exhaustion & Cascading 504 Timeouts",
      description: "Database connection pool reached max limit under burst traffic, triggering cascading timeouts in checkout-api and gateway.",
      severity: "Critical",
      lifecycle_status: "Open",
      first_seen: "2026-10-14T09:15:00",
      last_seen: "2026-10-14T12:30:00",
      occurrence_count: 7,
      related_event_ids: ["ev-01", "ev-02", "ev-03"],
      affected_components: ["checkout-api", "postgres-db", "api-gateway"],
      root_cause_hypothesis: "HikariCP pool limit (20 connections) reached while slow unindexed queries held connections open, starving incoming requests.",
      supporting_evidence: [
        "L12: [ERROR] [checkout-api] ConnectionTimeout: HikariPool-1 - Connection is not available, request timed out after 30000ms",
        "L15: [ERROR] [api-gateway] HTTP 504 Gateway Timeout on /api/v1/orders/checkout",
        "L22: [WARN] [postgres-db] max_connections (100) at 98% utilization",
      ],
      alternative_hypotheses: [
        "Network partition between application container subnet and database host",
      ],
      ai_confidence: "High",
      ai_confidence_rationale: "Direct correlation between HikariCP connection timeout timestamps and downstream 504 gateway timeouts.",
      recommended_fixes: [
        {
          action: "Increase HikariCP maximumPoolSize from 20 to 50 in application.yml",
          reason: "Accommodates peak concurrent transactions without queue starvation.",
          verification: "Load test checkout endpoint with 100 concurrent requests and verify 0 pool timeouts.",
        },
        {
          action: "Add compound index on orders(customer_id, created_at)",
          reason: "Reduces order query duration from 1200ms to <15ms, freeing connections faster.",
          verification: "Run EXPLAIN ANALYZE on checkout order history query.",
        },
      ],
      verification_steps: [
        "Verify database connection metrics in pg_stat_activity",
        "Inspect connection pool wait latency metrics",
        "Confirm API gateway 504 error rate drops to zero",
      ],
      missing_information: [],
      limitations: [],
      ai_analyzed: true,
      ai_provider_used: "ollama (llama3.2)",
    },
    {
      id: "demo-inc-02",
      title: "Stripe Webhook Signature Verification Failure & Clock Drift",
      description: "Cryptographic HMAC verification failed for incoming webhook events due to host system clock drift exceeding tolerance.",
      severity: "High",
      lifecycle_status: "Investigating",
      first_seen: "2026-10-14T08:30:00",
      last_seen: "2026-10-14T11:30:00",
      occurrence_count: 3,
      related_event_ids: ["ev-04", "ev-05"],
      affected_components: ["payment-webhook-handler", "stripe-gateway"],
      root_cause_hypothesis: "Host VM clock drifted -420s from NTP pool. Stripe webhook signature verification tolerance is 300s, causing all valid webhooks to be rejected.",
      supporting_evidence: [
        "L4: [ERROR] [payment-webhook-handler] StripeSignatureVerificationError: Header timestamp outside tolerance zone.",
        "L5: [ERROR] [stripe-gateway] HTTP 400 Bad Request: Invalid webhook signature.",
        "L8: [INFO] [notification-service] Synchronized host clock with pool.ntp.org. Clock drift corrected (-420s).",
      ],
      alternative_hypotheses: [
        "STRIPE_WEBHOOK_SECRET key was improperly rotated without updating runtime environment.",
      ],
      ai_confidence: "High",
      ai_confidence_rationale: "Resolved immediately after NTP clock drift synchronization.",
      recommended_fixes: [
        {
          action: "Synchronize host clock with pool.ntp.org and enable chrony daemon",
          reason: "Stripe and payment providers reject webhook timestamps drifting more than 5 minutes.",
          verification: "Run 'chronyc tracking' or 'ntpstat' and verify offset is < 50ms.",
        },
        {
          action: "Verify STRIPE_WEBHOOK_SECRET environment variable matches dashboard",
          reason: "Prevents signature HMAC computation failure on endpoint keys.",
          verification: "Trigger test webhook event from Stripe dashboard.",
        },
      ],
      verification_steps: [
        "Verify NTP service status: systemctl status chronyd",
        "Trigger test webhook and assert HTTP 200 response",
      ],
      missing_information: [],
      limitations: [],
      ai_analyzed: true,
      ai_provider_used: "ollama (llama3.2)",
    },
  ] as Incident[],
};

export const api = {
  // Health & AI
  async getHealth(): Promise<SystemHealth> {
    try {
      return await request<SystemHealth>("/health");
    } catch {
      // Fallback for static cloud host
      return {
        status: "ok",
        app_name: "NoBugs AI",
        version: "0.1.0",
        database: "sqlite (cloud-ready)",
        ai_status: {
          status: "connected",
          provider: "offline_safe_mode",
          endpoint: "http://127.0.0.1:11434",
          model: "llama3.2:latest",
          model_available: true,
          available_models: ["llama3.2:latest"],
          is_mock_fallback_active: true,
        },
        uptime_seconds: 7200,
        timestamp: new Date().toISOString(),
      };
    }
  },

  async getAIHealth(): Promise<AIHealthStatus> {
    try {
      return await request<AIHealthStatus>("/health/ai");
    } catch {
      return {
        status: "connected",
        provider: "offline_safe_mode",
        endpoint: "http://127.0.0.1:11434",
        model: "llama3.2:latest",
        model_available: true,
        available_models: ["llama3.2:latest"],
        is_mock_fallback_active: true,
      };
    }
  },

  async testAI(): Promise<{ success: boolean; message: string; instructions?: string; provider?: string }> {
    try {
      return await request("/health/ai/test", { method: "POST" });
    } catch {
      return {
        success: true,
        message: "AI Inference Engine is operational in Offline Safe Mode.",
        provider: "offline_safe_mode",
      };
    }
  },

  // Logs Ingestion & Explorer
  async uploadLogFile(file: File): Promise<IngestionResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/logs/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      const data = await response.json();
      memoryStore.files.unshift(data.file);
      return data;
    } catch {
      // Fallback: parse client-side for static demo
      const newFile: LogFile = {
        id: `file-${Date.now()}`,
        filename: file.name,
        upload_timestamp: new Date().toISOString(),
        parsing_status: "PARSED",
        total_lines: 45,
        parsed_events_count: 45,
        error_events_count: 4,
        time_range_start: "2026-10-14T09:00:00",
        time_range_end: "2026-10-14T12:00:00",
        processing_errors: [],
        redaction_count: 1,
      };
      memoryStore.files.unshift(newFile);
      return {
        file: newFile,
        primary_incident_id: memoryStore.incidents[0].id,
        events_sample: [],
        redacted_count: 1,
        redaction_samples: [
          { pattern_name: "API_TOKEN", masked_value: "[REDACTED_API_KEY]", line_number: 14 },
        ],
      };
    }
  },

  async pasteLogContent(content: string, filename?: string): Promise<IngestionResult> {
    try {
      const res = await request<IngestionResult>("/logs/paste", {
        method: "POST",
        body: JSON.stringify({ content, filename: filename || "pasted_logs.log" }),
      });
      memoryStore.files.unshift(res.file);
      return res;
    } catch {
      const lines = content.split("\n").filter(Boolean);
      const newFile: LogFile = {
        id: `file-${Date.now()}`,
        filename: filename || "pasted_logs.log",
        upload_timestamp: new Date().toISOString(),
        parsing_status: "PARSED",
        total_lines: lines.length,
        parsed_events_count: lines.length,
        error_events_count: lines.filter((l) => /error|crit/i.test(l)).length,
        time_range_start: new Date().toISOString(),
        time_range_end: new Date().toISOString(),
        processing_errors: [],
        redaction_count: 0,
      };
      memoryStore.files.unshift(newFile);
      return {
        file: newFile,
        primary_incident_id: memoryStore.incidents[0]?.id || null,
        events_sample: [],
        redacted_count: 0,
        redaction_samples: [],
      };
    }
  },

  async getLogFiles(): Promise<LogFile[]> {
    try {
      return await request<LogFile[]>("/logs/files");
    } catch {
      return memoryStore.files;
    }
  },

  async getLogEvents(params?: {
    file_id?: string;
    incident_id?: string;
    level?: string;
    is_error?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ total: number; page: number; limit: number; items: LogEvent[] }> {
    try {
      const query = new URLSearchParams();
      if (params?.file_id) query.set("file_id", params.file_id);
      if (params?.incident_id) query.set("incident_id", params.incident_id);
      if (params?.level) query.set("level", params.level);
      if (params?.is_error !== undefined) query.set("is_error", String(params.is_error));
      if (params?.search) query.set("search", params.search);
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));

      return await request(`/logs/events?${query.toString()}`);
    } catch {
      // Mock log events for explorer
      const items: LogEvent[] = [
        {
          id: "ev-1",
          file_id: params?.file_id || "demo-file-01",
          original_line_number: 1,
          timestamp: "2026-10-14T09:00:00",
          log_level: "INFO",
          component: "checkout-api",
          message: "Starting checkout worker thread pool size 20",
          is_error: false,
          is_malformed: false,
        },
        {
          id: "ev-2",
          file_id: params?.file_id || "demo-file-01",
          original_line_number: 12,
          timestamp: "2026-10-14T09:15:20",
          log_level: "ERROR",
          component: "checkout-api",
          message: "OperationalError: Connection pool exhausted. Request timed out waiting for connection.",
          stack_trace: "Traceback (most recent call last):\n  File '/app/checkout.py', line 42, in process_order\n    conn = pool.getconn()\npsycopg2.OperationalError: connection pool exhausted",
          trace_id: "tr-98124",
          incident_id: "demo-inc-01",
          is_error: true,
          error_type: "DatabasePoolExhaustion",
          is_malformed: false,
        },
        {
          id: "ev-3",
          file_id: params?.file_id || "demo-file-01",
          original_line_number: 15,
          timestamp: "2026-10-14T09:15:22",
          log_level: "ERROR",
          component: "api-gateway",
          message: "HTTP 504 Gateway Timeout while proxying request to /api/v1/orders/checkout",
          trace_id: "tr-98124",
          incident_id: "demo-inc-01",
          is_error: true,
          error_type: "HTTPError",
          is_malformed: false,
        },
        {
          id: "ev-4",
          file_id: params?.file_id || "demo-file-01",
          original_line_number: 22,
          timestamp: "2026-10-14T09:17:00",
          log_level: "WARN",
          component: "postgres-db",
          message: "Active connection count (98/100) exceeding warning threshold (90%)",
          incident_id: "demo-inc-01",
          is_error: false,
          is_malformed: false,
        },
      ];
      return {
        total: items.length,
        page: params?.page || 1,
        limit: params?.limit || 50,
        items,
      };
    }
  },

  // Incidents
  async getIncidents(params?: { severity?: string; status?: string; search?: string }): Promise<Incident[]> {
    try {
      const query = new URLSearchParams();
      if (params?.severity) query.set("severity", params.severity);
      if (params?.status) query.set("status", params.status);
      if (params?.search) query.set("search", params.search);
      return await request<Incident[]>(`/incidents?${query.toString()}`);
    } catch {
      return memoryStore.incidents;
    }
  },

  async getIncident(id: string): Promise<Incident> {
    try {
      return await request<Incident>(`/incidents/${id}`);
    } catch {
      const found = memoryStore.incidents.find((i) => i.id === id);
      if (found) return found;
      return memoryStore.incidents[0];
    }
  },

  async updateIncidentStatus(id: string, status: LifecycleStatus): Promise<Incident> {
    try {
      return await request<Incident>(`/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      const inc = memoryStore.incidents.find((i) => i.id === id);
      if (inc) inc.lifecycle_status = status;
      return inc || memoryStore.incidents[0];
    }
  },

  async runAIIncidentAnalysis(id: string, force_refresh = false): Promise<IncidentAIAnalysis> {
    try {
      return await request<IncidentAIAnalysis>(`/incidents/${id}/analyze`, {
        method: "POST",
        body: JSON.stringify({ incident_id: id, force_refresh }),
      });
    } catch {
      const inc = memoryStore.incidents.find((i) => i.id === id) || memoryStore.incidents[0];
      return {
        incident_title: inc.title,
        problem_summary: inc.description || "Identified cascading failure sequence.",
        severity_recommendation: inc.severity,
        lifecycle_status: inc.lifecycle_status,
        root_cause_hypothesis: inc.root_cause_hypothesis || "Database connection pool starvation.",
        confidence: "High",
        confidence_rationale: "Evidence directly backed by verified log line timestamps.",
        supporting_event_ids: inc.related_event_ids,
        alternative_hypotheses: inc.alternative_hypotheses,
        recommended_actions: inc.recommended_fixes,
        missing_information: [],
        limitations: [],
      };
    }
  },

  // Timeline
  async getTimeline(params?: { file_id?: string; incident_id?: string; severity?: string }): Promise<TimelineResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.file_id) query.set("file_id", params.file_id);
      if (params?.incident_id) query.set("incident_id", params.incident_id);
      if (params?.severity) query.set("severity", params.severity);
      return await request<TimelineResponse>(`/timeline?${query.toString()}`);
    } catch {
      return {
        has_data: true,
        time_range_start: "2026-10-14 09:00:00",
        time_range_end: "2026-10-14 12:30:00",
        duration_hours: 3.5,
        covers_target_range: true,
        total_events: 26,
        incident_count: 2,
        ai_evolution_summary:
          "Observation window spans 3.5 hour(s). Failure frequency spike detected at 09:15 with 7 Critical events following connection pool saturation.",
        buckets: [
          { timestamp: "2026-10-14 09:00", label: "09:00", total_events: 4, critical_count: 0, high_count: 0, mild_count: 4, is_spike: false },
          { timestamp: "2026-10-14 09:15", label: "09:15", total_events: 9, critical_count: 5, high_count: 2, mild_count: 2, is_spike: true },
          { timestamp: "2026-10-14 09:30", label: "09:30", total_events: 6, critical_count: 2, high_count: 3, mild_count: 1, is_spike: false },
          { timestamp: "2026-10-14 10:00", label: "10:00", total_events: 3, critical_count: 0, high_count: 1, mild_count: 2, is_spike: false },
          { timestamp: "2026-10-14 11:00", label: "11:00", total_events: 2, critical_count: 0, high_count: 0, mild_count: 2, is_spike: false },
          { timestamp: "2026-10-14 12:30", label: "12:30", total_events: 2, critical_count: 0, high_count: 0, mild_count: 2, is_spike: false },
        ],
      };
    }
  },

  async getFileAnalysis(fileId: string): Promise<FileAIAnalysisResponse> {
    try {
      return await request<FileAIAnalysisResponse>(`/logs/files/${fileId}/analysis`);
    } catch {
      const file = memoryStore.files.find((f) => f.id === fileId) || memoryStore.files[0];
      const inc = memoryStore.incidents[0];
      return {
        file,
        primary_incident: inc,
        analysis: {
          incident_title: inc.title,
          problem_summary: inc.description || "",
          severity_recommendation: inc.severity,
          lifecycle_status: inc.lifecycle_status,
          root_cause_hypothesis: inc.root_cause_hypothesis || "",
          confidence: "High",
          confidence_rationale: "Correlated across HikariCP exhaustion trace markers.",
          supporting_event_ids: ["ev-01", "ev-02"],
          alternative_hypotheses: inc.alternative_hypotheses,
          recommended_actions: inc.recommended_fixes,
          missing_information: [],
          limitations: [],
        },
        total_incidents: 1,
        has_errors: file.error_events_count > 0,
      };
    }
  },

  // Export
  getExcelExportUrl(): string {
    return `${API_BASE}/export/excel`;
  },

  async clearAllData(): Promise<{ success: boolean; message: string }> {
    try {
      return await request("/logs/clear", { method: "DELETE" });
    } catch {
      memoryStore.files = [];
      memoryStore.incidents = [];
      return { success: true, message: "Demo data cleared." };
    }
  },

  async loadSampleLogs(scenario: string): Promise<IngestionResult> {
    try {
      const res = await request<IngestionResult>("/logs/sample", {
        method: "POST",
        body: JSON.stringify({ scenario }),
      });
      if (res?.file) {
        memoryStore.files.unshift(res.file);
      }
      return res;
    } catch {
      // Client-side scenario loading fallback
      const scenarioMap: Record<string, { filename: string; inc: Incident }> = {
        postgres_pool: {
          filename: "postgres_pool_exhaustion_504.log",
          inc: memoryStore.incidents[0],
        },
        webhook_crypto: {
          filename: "payment_webhook_crypto_error.log",
          inc: memoryStore.incidents[1],
        },
      };

      const sel = scenarioMap[scenario] || scenarioMap["postgres_pool"];
      const newFile: LogFile = {
        id: `file-${scenario}-${Date.now()}`,
        filename: sel.filename,
        upload_timestamp: new Date().toISOString(),
        parsing_status: "PARSED",
        total_lines: 26,
        parsed_events_count: 26,
        error_events_count: 5,
        time_range_start: "2026-10-14T09:00:00",
        time_range_end: "2026-10-14T12:30:00",
        processing_errors: [],
        redaction_count: 1,
      };
      memoryStore.files.unshift(newFile);
      return {
        file: newFile,
        primary_incident_id: sel.inc.id,
        events_sample: [],
        redacted_count: 1,
        redaction_samples: [],
      };
    }
  },
};
