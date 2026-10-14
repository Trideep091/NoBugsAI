import React from "react";
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  FileSpreadsheet,
  PlusCircle,
  FileText,
  Sparkles,
  Lock,
  Layers,
  Wrench,
} from "lucide-react";
import type { Incident, LogFile, SystemHealth } from "../../types";

interface OverviewViewProps {
  incidents: Incident[];
  logFiles: LogFile[];
  systemHealth: SystemHealth | null;
  onSelectIncident: (id: string) => void;
  onTapLogFile: (fileId: string) => void;
  onNavigateToUpload: () => void;
  onNavigateToTimeline: () => void;
  onExportReport: () => void;
  onOpenSampleModal: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  incidents,
  logFiles,
  systemHealth,
  onSelectIncident,
  onTapLogFile,
  onNavigateToUpload,
  onNavigateToTimeline,
  onExportReport,
  onOpenSampleModal,
}) => {
  const hasFiles = logFiles.length > 0;

  const total = incidents.length;
  const critical = incidents.filter((i) => i.severity === "Critical").length;
  const high = incidents.filter((i) => i.severity === "High").length;
  const mild = incidents.filter((i) => i.severity === "Mild").length;
  const openCount = incidents.filter((i) => i.lifecycle_status === "Open" || i.lifecycle_status === "Reopened").length;
  const investigatingCount = incidents.filter((i) => i.lifecycle_status === "Investigating").length;
  const resolvedCount = incidents.filter((i) => i.lifecycle_status === "Resolved").length;
  const aiAnalyzedCount = incidents.filter((i) => i.ai_analyzed).length;

  const topRecurring = [...incidents].sort((a, b) => b.occurrence_count - a.occurrence_count).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Incident Command & Investigation Overview</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time correlation of error cascades, evidence-backed AI diagnoses, and historical health metrics.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateToUpload}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ingest New Logs</span>
          </button>
          {hasFiles && (
            <button
              onClick={onExportReport}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/80 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Report (.xlsx)</span>
            </button>
          )}
        </div>
      </div>

      {/* REQUIREMENT 1: Show statistics ONLY once log files are uploaded! */}
      {!hasFiles ? (
        /* Empty / Onboarding State - No statistics shown before log upload */
        <div className="space-y-6 py-6">
          <div className="bg-gradient-to-br from-gray-900/90 via-gray-900/60 to-gray-950 border border-gray-800 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                <FileText className="w-8 h-8 text-indigo-400" />
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight">
                No Log Files Uploaded Yet
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Statistics, error frequency graphs, cascade grouping, and AI root-cause suggestions will appear here automatically once you upload your application logs.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={onNavigateToUpload}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Ingest Application Logs</span>
                </button>
                <button
                  onClick={onOpenSampleModal}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Load Production Scenarios</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Automated Secret Redaction</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                API keys, passwords, bearer tokens, and JWTs are automatically stripped before analysis or persistence. Zero credential leakage.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Cascade Incident Correlation</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Aggregates downstream timeout spikes, distributed trace IDs, and database pool failures into coherent root incidents.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">AI Diagnostics & Remediation</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tap any uploaded log file for immediate AI root-cause hypotheses, verification checklists, and step-by-step remediation advice.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Statistics & Data Grid - Rendered once log files are uploaded */
        <>
          {/* Uploaded Log Files Quick Strip (Tap to Analyze) */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Uploaded Log Files ({logFiles.length})
                </h3>
                <span className="text-[10px] text-gray-400">
                  — Tap any file for instant AI problem diagnosis & remediation
                </span>
              </div>
              <button
                onClick={onNavigateToUpload}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Add File
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {logFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onTapLogFile(file.id)}
                  className="group bg-gray-950/80 hover:bg-gray-900 border border-gray-800/80 hover:border-indigo-500/50 rounded-xl p-3 cursor-pointer transition-all flex items-center justify-between shadow-sm"
                  title="Tap to view AI analysis and problem suggestions for this log file"
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-gray-200 group-hover:text-indigo-300 truncate">
                        {file.filename}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                      <span>{file.parsed_events_count} events</span>
                      <span>•</span>
                      <span className={file.error_events_count > 0 ? "text-red-400 font-semibold" : "text-emerald-400"}>
                        {file.error_events_count} errors
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white border border-indigo-500/20 text-[10px] font-semibold transition-all">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Analyze</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Incidents */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Total Incidents</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {openCount} requiring action, {investigatingCount} in triage
                </p>
              </div>
            </div>

            {/* Critical Outages */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Critical Severity</span>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-red-400">{critical}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">High-impact service degradation</p>
              </div>
            </div>

            {/* High & Mild breakdown */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">High / Mild Severity</span>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-gray-200">
                  <span className="text-orange-400">{high}</span> <span className="text-gray-500 text-lg">/</span>{" "}
                  <span className="text-amber-400">{mild}</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{high} feature impairments, {mild} warnings</p>
              </div>
            </div>

            {/* AI Diagnoses */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">AI RCA Diagnoses</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-400">
                  {aiAnalyzedCount} <span className="text-gray-500 text-xs font-normal">/ {total} analyzed</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Evidence validated without hallucination</span>
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Split: Top Recurring Incidents & Status Triage */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Top Incidents List */}
            <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <span>Prioritized & Recurring Incidents</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold">
                      {incidents.length} Detected
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">Grouped by signature similarity, cascade chains, and trace IDs</p>
                </div>
                <button
                  onClick={onNavigateToTimeline}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                >
                  <span>View Timeline</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {incidents.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-800 text-gray-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">No active incidents detected</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Uploaded logs contain no severe error traces, or all failures have been resolved.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topRecurring.map((inc) => {
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
                        className="group p-3.5 rounded-xl border border-gray-800 hover:border-indigo-500/40 bg-gray-950/60 hover:bg-gray-900/80 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="space-y-1.5 max-w-[70%]">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${sevColor}`}>
                              {inc.severity}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}>
                              {inc.lifecycle_status}
                            </span>
                            {inc.ai_analyzed && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
                                <Brain className="w-2.5 h-2.5" />
                                <span>AI Diagnosed</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                            {inc.title}
                          </h4>
                          <p className="text-[11px] text-gray-400 truncate">
                            {inc.root_cause_hypothesis || inc.description}
                          </p>
                        </div>

                        <div className="text-right space-y-1 shrink-0 pl-3">
                          <div className="text-xs font-bold text-gray-200">
                            {inc.occurrence_count} <span className="text-[10px] font-normal text-gray-500">events</span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {inc.first_seen ? inc.first_seen.split("T")[1]?.slice(0, 5) : "N/A"}
                          </div>
                          <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium inline-block">
                            Investigate →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col: Lifecycle Triage Breakdown & System Info */}
            <div className="space-y-4">
              {/* Status Breakdown */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Investigation Lifecycle</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Open (Unresolved)</span>
                      <span className="font-semibold text-amber-400">{openCount}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${total ? (openCount / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Investigating (In Triage)</span>
                      <span className="font-semibold text-blue-400">{investigatingCount}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-400 h-full rounded-full transition-all"
                        style={{ width: `${total ? (investigatingCount / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Resolved</span>
                      <span className="font-semibold text-emerald-400">{resolvedCount}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${total ? (resolvedCount / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick System Info card */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white">Platform Telemetry</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400">Database Engine:</span>
                    <span className="text-emerald-400 font-mono">SQLite (PostgreSQL Ready)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400">AI Inference Engine:</span>
                    <span className="text-indigo-400 font-semibold font-mono">
                      {systemHealth?.ai_status?.model_available ? "Ollama Local" : "Offline Safe Engine"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400">Secret Redactor:</span>
                    <span className="text-emerald-400 font-medium">Active (Automatic)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
