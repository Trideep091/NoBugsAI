import React from "react";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Sparkles,
  ShieldCheck,
  FileText,
  X,
  ArrowRight,
  Lock,
  Clock,
  Terminal,
  Activity,
} from "lucide-react";
import type { FileAIAnalysisResponse } from "../../types";

interface FileAIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  analysisData: FileAIAnalysisResponse | null;
  onInvestigateIncident?: (incidentId: string) => void;
  onExploreFileEvents?: (fileId: string) => void;
}

export const FileAIAnalysisModal: React.FC<FileAIAnalysisModalProps> = ({
  isOpen,
  onClose,
  loading,
  analysisData,
  onInvestigateIncident,
  onExploreFileEvents,
}) => {
  if (!isOpen) return null;

  const file = analysisData?.file;
  const incident = analysisData?.primary_incident;
  const analysis = analysisData?.analysis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full my-8 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-start justify-between bg-gray-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  AI Log Analysis & Problem Suggestions
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>AI Powered</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {file ? (
                  <span className="font-mono text-gray-300">{file.filename}</span>
                ) : (
                  "Analyzing log stream..."
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-300">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Brain className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm font-semibold text-gray-200">
                AI is analyzing log events and diagnosing root cause...
              </p>
              <p className="text-xs text-gray-400 max-w-sm text-center">
                Correlating stack traces, evaluating error patterns, and formulating problem-specific remediation steps.
              </p>
            </div>
          ) : !analysisData ? (
            <div className="py-12 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-medium text-gray-200">Analysis unavailable</p>
              <p className="text-xs text-gray-400">Could not retrieve AI diagnostic suggestions for this file.</p>
            </div>
          ) : (
            <>
              {/* File Telemetry Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Lines</span>
                  <p className="text-sm font-bold text-white mt-0.5">{file?.total_lines || 0}</p>
                </div>
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Parsed Events</span>
                  <p className="text-sm font-bold text-white mt-0.5">{file?.parsed_events_count || 0}</p>
                </div>
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Error Events</span>
                  <p className={`text-sm font-bold mt-0.5 ${file && file.error_events_count > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {file?.error_events_count || 0}
                  </p>
                </div>
                <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Redactions</span>
                  <p className="text-sm font-bold text-amber-400 mt-0.5 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{file?.redaction_count || 0}</span>
                  </p>
                </div>
              </div>

              {/* Diagnosis & Root Cause Box */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-950 border border-indigo-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                        Problem Diagnosis
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        {incident?.title || "Log Stream Ingestion Evaluation"}
                      </h3>
                    </div>
                  </div>

                  {incident?.severity && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        incident.severity === "Critical"
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : incident.severity === "High"
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {incident.severity} Severity
                    </span>
                  )}
                </div>

                {/* Root Cause Hypothesis */}
                <div className="bg-black/50 p-3.5 rounded-xl border border-gray-800 space-y-1.5">
                  <div className="flex items-center space-x-2 text-[11px] font-semibold text-indigo-300">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Likely Root Cause</span>
                    {analysis?.confidence && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                        {analysis.confidence} Confidence
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-sans">
                    {analysis?.root_cause_hypothesis ||
                      incident?.root_cause_hypothesis ||
                      incident?.description ||
                      "No critical errors were detected in this log file."}
                  </p>
                  {analysis?.confidence_rationale && (
                    <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-800/60">
                      Rationale: {analysis.confidence_rationale}
                    </p>
                  )}
                </div>
              </div>

              {/* Actionable Suggestions & Recommended Fixes */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Problem-Specific AI Suggestions & Remediation
                  </h4>
                </div>

                {((analysis?.recommended_actions && analysis.recommended_actions.length > 0) ||
                  (incident?.recommended_fixes && incident.recommended_fixes.length > 0)) ? (
                  <div className="space-y-2.5">
                    {(analysis?.recommended_actions || incident?.recommended_fixes || []).map((fix, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 hover:border-emerald-500/30 transition-all space-y-1.5"
                      >
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="space-y-1 flex-1">
                            <p className="font-semibold text-xs text-emerald-300">
                              {fix.action}
                            </p>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                              <strong className="text-gray-300">Why: </strong>
                              {fix.reason}
                            </p>
                            {fix.verification && (
                              <p className="text-[11px] text-indigo-300/90 leading-relaxed font-mono bg-black/40 p-1.5 rounded-lg border border-gray-800">
                                <strong>Verification: </strong> {fix.verification}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-gray-400 text-xs">
                    No active corrective actions required. The log stream exhibits normal operating parameters.
                  </div>
                )}
              </div>

              {/* Verification Steps */}
              {incident?.verification_steps && incident.verification_steps.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Engineer Verification Checklist
                    </h4>
                  </div>
                  <div className="bg-gray-950 rounded-xl p-3 border border-gray-800 space-y-1.5">
                    {incident.verification_steps.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 text-[11px] text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlated Evidence / Supporting Quotes */}
              {incident?.supporting_evidence && incident.supporting_evidence.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Log Evidence Backing Diagnosis (Anti-Hallucination)
                    </h4>
                  </div>
                  <div className="bg-black/80 rounded-xl p-3 border border-gray-800 font-mono text-[11px] text-cyan-200/90 space-y-1 overflow-x-auto">
                    {incident.supporting_evidence.map((ev: string, idx: number) => (
                      <div key={idx} className="py-0.5 border-b border-gray-800/40 last:border-0 truncate">
                        • {ev}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            {file && (
              <span>
                Processed in NoBugs AI • Zero secret leakage
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {file && onExploreFileEvents && (
              <button
                onClick={() => {
                  onClose();
                  onExploreFileEvents(file.id);
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>View Raw Events</span>
              </button>
            )}

            {incident && onInvestigateIncident && (
              <button
                onClick={() => {
                  onClose();
                  onInvestigateIncident(incident.id);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-colors"
              >
                <span>Full Incident Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
