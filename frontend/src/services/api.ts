/**
 * NoBugs AI - API Service Layer
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
      else if (errorData.detail) errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
    } catch {
      // ignore json parse error on non-json error responses
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Health & AI
  async getHealth(): Promise<SystemHealth> {
    return request<SystemHealth>("/health");
  },

  async getAIHealth(): Promise<AIHealthStatus> {
    return request<AIHealthStatus>("/health/ai");
  },

  async testAI(): Promise<{ success: boolean; message: string; instructions?: string; provider?: string }> {
    return request("/health/ai/test", { method: "POST" });
  },

  // Logs Ingestion & Explorer
  async uploadLogFile(file: File): Promise<IngestionResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/logs/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let err = `Upload failed with status ${response.status}`;
      try {
        const data = await response.json();
        if (data.message) err = data.message;
        else if (data.detail) err = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      } catch {}
      throw new Error(err);
    }

    return response.json();
  },

  async pasteLogContent(content: string, filename?: string): Promise<IngestionResult> {
    return request<IngestionResult>("/logs/paste", {
      method: "POST",
      body: JSON.stringify({ content, filename: filename || "pasted_logs.log" }),
    });
  },

  async getLogFiles(): Promise<LogFile[]> {
    return request<LogFile[]>("/logs/files");
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
    const query = new URLSearchParams();
    if (params?.file_id) query.set("file_id", params.file_id);
    if (params?.incident_id) query.set("incident_id", params.incident_id);
    if (params?.level) query.set("level", params.level);
    if (params?.is_error !== undefined) query.set("is_error", String(params.is_error));
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    return request(`/logs/events?${query.toString()}`);
  },

  // Incidents
  async getIncidents(params?: { severity?: string; status?: string; search?: string }): Promise<Incident[]> {
    const query = new URLSearchParams();
    if (params?.severity) query.set("severity", params.severity);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    return request<Incident[]>(`/incidents?${query.toString()}`);
  },

  async getIncident(id: string): Promise<Incident> {
    return request<Incident>(`/incidents/${id}`);
  },

  async updateIncidentStatus(id: string, status: LifecycleStatus): Promise<Incident> {
    return request<Incident>(`/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async runAIIncidentAnalysis(id: string, force_refresh = false): Promise<IncidentAIAnalysis> {
    return request<IncidentAIAnalysis>(`/incidents/${id}/analyze`, {
      method: "POST",
      body: JSON.stringify({ incident_id: id, force_refresh }),
    });
  },

  // Timeline
  async getTimeline(params?: { file_id?: string; incident_id?: string; severity?: string }): Promise<TimelineResponse> {
    const query = new URLSearchParams();
    if (params?.file_id) query.set("file_id", params.file_id);
    if (params?.incident_id) query.set("incident_id", params.incident_id);
    if (params?.severity) query.set("severity", params.severity);
    return request<TimelineResponse>(`/timeline?${query.toString()}`);
  },

  async getFileAnalysis(fileId: string): Promise<FileAIAnalysisResponse> {
    return request<FileAIAnalysisResponse>(`/logs/files/${fileId}/analysis`);
  },

  // Export
  getExcelExportUrl(): string {
    return `${API_BASE}/export/excel`;
  },

  async clearAllData(): Promise<{ success: boolean; message: string }> {
    return request("/logs/clear", { method: "DELETE" });
  },

  async loadSampleLogs(scenario: string): Promise<IngestionResult> {
    return request<IngestionResult>("/logs/sample", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    });
  },
};
