/**
 * NoBugs AI - TypeScript Core Data Types & API Contracts
 */

export type Severity = "Critical" | "High" | "Mild";
export type LifecycleStatus = "Open" | "Investigating" | "Resolved" | "Reopened";
export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "WARNING" | "ERROR" | "FATAL" | "CRITICAL" | "UNKNOWN";
export type ParsingStatus = "PENDING" | "PARSED" | "FAILED";

export interface AIHealthStatus {
  status: "connected" | "unavailable";
  provider: string;
  endpoint: string;
  model: string;
  model_available: boolean;
  available_models: string[];
  error_message?: string | null;
  setup_instructions?: string | null;
  is_mock_fallback_active: boolean;
}

export interface SystemHealth {
  status: "ok" | "degraded";
  app_name: string;
  version: string;
  database: string;
  ai_status: AIHealthStatus;
  uptime_seconds: number;
  timestamp: string;
}

export interface LogFile {
  id: string;
  filename: string;
  upload_timestamp: string;
  parsing_status: ParsingStatus;
  total_lines: number;
  parsed_events_count: number;
  error_events_count: number;
  time_range_start?: string | null;
  time_range_end?: string | null;
  processing_errors: string[];
  raw_preview?: string | null;
  redaction_count: number;
}

export interface LogEvent {
  id: string;
  file_id: string;
  original_line_number: number;
  timestamp?: string | null;
  log_level: LogLevel;
  component?: string | null;
  message: string;
  stack_trace?: string | null;
  trace_id?: string | null;
  request_id?: string | null;
  incident_id?: string | null;
  is_error: boolean;
  error_type?: string | null;
  signature?: string | null;
  is_malformed: boolean;
}

export interface RecommendedAction {
  action: string;
  reason: string;
  verification: string;
}

export interface IncidentAIAnalysis {
  incident_title: string;
  problem_summary: string;
  severity_recommendation: Severity;
  lifecycle_status: LifecycleStatus;
  root_cause_hypothesis: string;
  confidence: "High" | "Medium" | "Low";
  confidence_rationale: string;
  supporting_event_ids: string[];
  alternative_hypotheses: string[];
  recommended_actions: RecommendedAction[];
  missing_information: string[];
  limitations: string[];
}

export interface Incident {
  id: string;
  title: string;
  description?: string | null;
  severity: Severity;
  lifecycle_status: LifecycleStatus;
  first_seen?: string | null;
  last_seen?: string | null;
  occurrence_count: number;
  related_event_ids: string[];
  affected_components: string[];
  root_cause_hypothesis?: string | null;
  supporting_evidence: string[];
  alternative_hypotheses: string[];
  ai_confidence?: "High" | "Medium" | "Low" | null;
  ai_confidence_rationale?: string | null;
  recommended_fixes: RecommendedAction[];
  verification_steps: string[];
  missing_information: string[];
  limitations: string[];
  last_analysis_timestamp?: string | null;
  ai_analyzed: boolean;
  ai_provider_used?: string | null;
  events?: LogEvent[];
}

export interface TimelineBucket {
  timestamp: string;
  label: string;
  total_events: number;
  critical_count: number;
  high_count: number;
  mild_count: number;
  is_spike: boolean;
}

export interface TimelineResponse {
  has_data: boolean;
  time_range_start?: string | null;
  time_range_end?: string | null;
  duration_hours?: number;
  covers_target_range: boolean; // 3-4 hours
  buckets: TimelineBucket[];
  total_events: number;
  incident_count: number;
  ai_evolution_summary?: string | null;
}

export interface RedactionPreviewItem {
  pattern_name: string;
  masked_value: string;
  line_number: number;
}

export interface IngestionResult {
  file: LogFile;
  primary_incident_id?: string | null;
  events_sample: LogEvent[];
  redacted_count: number;
  redaction_samples: RedactionPreviewItem[];
}

export interface FileAIAnalysisResponse {
  file: LogFile;
  primary_incident?: Incident | null;
  analysis?: IncidentAIAnalysis | null;
  total_incidents: number;
  has_errors: boolean;
}

