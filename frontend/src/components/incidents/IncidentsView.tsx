import React, { useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  Check,
  ChevronDown,
  Layers,
  FileText,
  HelpCircle,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { Incident, LifecycleStatus, Severity } from "../../types";

interface IncidentsViewProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (id: string) => void;
  onStatusChange: (id: string, status: LifecycleStatus) => void;
  onRunAiAnalysis: (id: string) => void;
  analyzingId: string | null;
  onNavigateToExplorer: (incidentId?: string) => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onStatusChange,
  onRunAiAnalysis,
  analyzingId,
  onNavigateToExplorer,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    if (severityFilter !== "ALL" && inc.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && inc.lifecycle_status !== statusFilter) return false;
    if (
      searchQuery &&
      !inc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !inc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-indigo-400" />
            <span>Incident Investigation & Root-Cause Triage</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Correlated failure cascades, evidence-backed hypotheses, and problem-specific remediation plans.
          </p>
        </div>
      </div>

      {/* Main Split: Incident List (Left) & Incident Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filterable Incidents List (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filters Bar */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search incidents or root causes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 text-[11px]">
              <div className="flex-1">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Mild">Mild</option>
                </select>
              </div>
              <div className="flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Reopened">Reopened</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incidents Scrollable List */}
          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-10 bg-gray-900/40 border border-gray-800 rounded-2xl p-4">
                <p className="text-xs text-gray-400">No incidents match the active filters.</p>
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const sevColor =
                  inc.severity === "Critical"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : inc.severity === "High"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

                const statusColor =
                  inc.lifecycle_status === "Resolved"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : inc.lifecycle_status === "Investigating"
                    ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/20";

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10"
                        : "bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${sevColor}`}>
                          {inc.severity}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}>
                          {inc.lifecycle_status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {inc.occurrence_count} {inc.occurrence_count === 1 ? "event" : "events"}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-gray-200 line-clamp-1">{inc.title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">
                      {inc.root_cause_hypothesis || inc.description}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/60 text-[10px] text-gray-500">
                      <span>{inc.affected_components.join(", ") || "General"}</span>
                      {inc.ai_analyzed && (
                        <span className="text-indigo-400 font-medium flex items-center space-x-1">
                          <Brain className="w-3 h-3" />
                          <span>AI Analyzed</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Investigation & AI Diagnosis (7 cols) */}
        <div className="lg:col-span-7">
          {!selectedIncident ? (
            <div className="text-center py-24 bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 text-gray-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-300">Select an incident to investigate</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Choose an incident from the list to review the observed events, AI root-cause hypotheses, and actionable remediation steps.
              </p>
            </div>
          ) : (
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-5 shadow-xl">
              {/* Incident Header & Triage Bar */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-gray-800 gap-3">
                <div className="space-y-1.5 max-w-[70%]">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        selectedIncident.severity === "Critical"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : selectedIncident.severity === "High"
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {selectedIncident.severity} Severity
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      ID: {selectedIncident.id.slice(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight">{selectedIncident.title}</h2>
                  <p className="text-xs text-gray-400">{selectedIncident.description}</p>
                </div>

                {/* Status selector & AI trigger action */}
                <div className="flex flex-col sm:items-end space-y-2 shrink-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-gray-400">Status:</span>
                    <select
                      value={selectedIncident.lifecycle_status}
                      onChange={(e) =>
                        onStatusChange(selectedIncident.id, e.target.value as LifecycleStatus)
                      }
                      className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Reopened">Reopened</option>
                    </select>
                  </div>

                  <button
                    onClick={() => onRunAiAnalysis(selectedIncident.id)}
                    disabled={analyzingId === selectedIncident.id}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${analyzingId === selectedIncident.id ? "animate-spin" : ""}`} />
                    <span>
                      {analyzingId === selectedIncident.id
                        ? "Analyzing Context..."
                        : selectedIncident.ai_analyzed
                        ? "Re-Run AI Analysis"
                        : "Diagnose with AI"}
                    </span>
                  </button>
                </div>
              </div>

              {/* AI Root-Cause Diagnosis Panel */}
              <div className="p-4 rounded-xl bg-gray-950 border border-indigo-950/60 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span>AI Root-Cause Diagnosis</span>
                  </div>

                  {selectedIncident.ai_confidence && (
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] text-gray-400">Confidence:</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          selectedIncident.ai_confidence === "High"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : selectedIncident.ai_confidence === "Medium"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {selectedIncident.ai_confidence} Confidence
                      </span>
                    </div>
                  )}
                </div>

                {/* Root cause hypothesis */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-300">Likely Root Cause:</span>
                  <p className="text-xs text-gray-200 leading-relaxed bg-gray-900/80 p-3 rounded-lg border border-gray-800">
                    {selectedIncident.root_cause_hypothesis ||
                      "Pending analysis. Click 'Diagnose with AI' to generate evidence-backed root cause hypothesis and remediation plan."}
                  </p>
                </div>

                {/* Confidence Rationale */}
                {selectedIncident.ai_confidence_rationale && (
                  <div className="text-[11px] text-gray-400 flex items-start space-x-1.5 bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/60">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                    <span><strong>Rationale:</strong> {selectedIncident.ai_confidence_rationale}</span>
                  </div>
                )}

                {/* Alternative Hypotheses */}
                {selectedIncident.alternative_hypotheses?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400">Alternative Explanations Considered:</span>
                    <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-0.5 pl-1">
                      {selectedIncident.alternative_hypotheses.map((alt, idx) => (
                        <li key={idx}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Remediation & Debugging steps */}
                {selectedIncident.recommended_fixes?.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-gray-800/80">
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Recommended Problem-Specific Remediation & Verification</span>
                    </span>
                    <div className="space-y-2">
                      {selectedIncident.recommended_fixes.map((fix, idx) => (
                        <div key={idx} className="bg-gray-900 p-2.5 rounded-lg border border-gray-800 text-xs space-y-1">
                          <p className="font-semibold text-gray-200">
                            {idx + 1}. {fix.action}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            <span className="text-gray-500 font-medium">Why:</span> {fix.reason}
                          </p>
                          <p className="text-[11px] text-indigo-300">
                            <span className="text-gray-500 font-medium">Verify:</span> {fix.verification}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Information & Limitations */}
                {(selectedIncident.missing_information?.length > 0 || selectedIncident.limitations?.length > 0) && (
                  <div className="pt-2 border-t border-gray-800/60 text-[10px] text-gray-500 space-y-1">
                    {selectedIncident.missing_information?.length > 0 && (
                      <p>
                        <strong>Missing Telemetry:</strong> {selectedIncident.missing_information.join("; ")}
                      </p>
                    )}
                    {selectedIncident.limitations?.length > 0 && (
                      <p>
                        <strong>Diagnostic Limitations:</strong> {selectedIncident.limitations.join("; ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Associated Evidence Events */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Correlated Log Events ({selectedIncident.events?.length || selectedIncident.occurrence_count})</span>
                  </h3>
                  <button
                    onClick={() => onNavigateToExplorer(selectedIncident.id)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                  >
                    <span>View in Log Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedIncident.events?.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg bg-gray-950 border border-gray-800/80 font-mono text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">L{ev.original_line_number}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              ev.log_level === "ERROR" || ev.log_level === "CRITICAL"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            {ev.log_level}
                          </span>
                          {ev.component && <span className="text-indigo-400">[{ev.component}]</span>}
                        </div>
                        <span>{ev.timestamp ? ev.timestamp.replace("T", " ").slice(0, 19) : "No timestamp"}</span>
                      </div>

                      <p className="text-gray-200 text-xs break-all whitespace-pre-wrap">{ev.message}</p>

                      {ev.stack_trace && (
                        <div>
                          <button
                            onClick={() =>
                              setExpandedTrace(expandedTrace === ev.id ? null : ev.id)
                            }
                            className="text-[10px] text-indigo-400 hover:underline flex items-center space-x-1 mt-1"
                          >
                            <span>{expandedTrace === ev.id ? "Hide Traceback" : "View Stack Trace"}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${expandedTrace === ev.id ? "rotate-180" : ""}`} />
                          </button>
                          {expandedTrace === ev.id && (
                            <pre className="mt-1.5 p-2 bg-black/90 rounded border border-gray-800 text-[10px] text-red-300 overflow-x-auto whitespace-pre-wrap font-mono">
                              {ev.stack_trace}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
