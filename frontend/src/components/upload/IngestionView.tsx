import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  Clipboard,
  Layers,
  Brain,
  FileText,
  Activity,
} from "lucide-react";
import type { IngestionResult, LogFile } from "../../types";

interface IngestionViewProps {
  logFiles: LogFile[];
  onUploadSuccess: (result: IngestionResult) => void;
  onOpenSampleModal: () => void;
  onNavigateToIncidents: () => void;
  onNavigateToExplorer: () => void;
  onTapLogFile: (fileId: string) => void;
}

export const IngestionView: React.FC<IngestionViewProps> = ({
  logFiles,
  onUploadSuccess,
  onOpenSampleModal,
  onNavigateToIncidents,
  onNavigateToExplorer,
  onTapLogFile,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteContent, setPasteContent] = useState("");
  const [pastedFilename, setPastedFilename] = useState("application.log");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<IngestionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/logs/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || data.message || `Upload failed with status ${response.status}`);
      }

      const result: IngestionResult = await response.json();
      setLatestResult(result);
      onUploadSuccess(result);
    } catch (err: any) {
      setError(err.message || "Failed to process log file");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      setError("Please paste some log content before submitting.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/logs/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: pasteContent,
          filename: pastedFilename || "pasted_logs.log",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || data.message || `Processing failed with status ${response.status}`);
      }

      const result: IngestionResult = await response.json();
      setLatestResult(result);
      onUploadSuccess(result);
    } catch (err: any) {
      setError(err.message || "Failed to parse pasted logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Ingest & Parse Application Logs</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Submit raw or structured log files. Sensitive credentials are automatically redacted before analysis.
          </p>
        </div>
        <button
          onClick={onOpenSampleModal}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Load Production Scenarios</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("upload")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === "upload"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Drag-and-Drop Upload</span>
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === "paste"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Copy & Paste Log Editor</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[200px] ${
            isDragging
              ? "border-indigo-500 bg-indigo-950/20 shadow-xl shadow-indigo-500/10"
              : "border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:bg-gray-900/60"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".log,.txt,.json,.out"
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-gray-200 mb-1">
            {loading ? "Processing log stream..." : "Drag & drop your log files here"}
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Supports <span className="text-gray-300 font-mono">.log</span>,{" "}
            <span className="text-gray-300 font-mono">.txt</span>, and{" "}
            <span className="text-gray-300 font-mono">.json</span> files (up to 10MB)
          </p>
          <button
            type="button"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
          >
            {loading ? "Analyzing..." : "Choose File from Computer"}
          </button>
        </div>
      )}

      {/* Paste Tab */}
      {activeTab === "paste" && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 font-medium">Virtual Filename:</span>
            <input
              type="text"
              value={pastedFilename}
              onChange={(e) => setPastedFilename(e.target.value)}
              placeholder="e.g. api_service.log"
              className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <textarea
              rows={12}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste raw log lines, stack traces, or JSON logs here...&#10;2026-10-14 10:00:00 [ERROR] [checkout-api] Connection timeout to database..."
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <div className="absolute bottom-3 right-4 text-[10px] text-gray-500 font-mono">
              {pasteContent.split("\n").filter(Boolean).length} lines | {pasteContent.length} chars
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setPasteContent("")}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-xs font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handlePasteSubmit}
              disabled={loading || !pasteContent.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
            >
              {loading ? "Parsing & Redacting..." : "Ingest & Analyze Logs"}
            </button>
          </div>
        </div>
      )}

      {/* Ingestion Results & Redaction Preview Card */}
      {latestResult && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-800/80 gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>{latestResult.file.filename}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Parsed Successfully
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  {latestResult.file.parsed_events_count} events structured from {latestResult.file.total_lines} raw lines
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* REQUIREMENT 4: Tap file to see AI analysis & suggestions */}
              <button
                onClick={() => onTapLogFile(latestResult.file.id)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all"
                title="Tap to see AI root cause diagnosis and suggestions"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>AI Problem Suggestions</span>
              </button>

              <button
                onClick={onNavigateToExplorer}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Explore Events</span>
              </button>
              <button
                onClick={onNavigateToIncidents}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <span>Incidents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-950 p-3 rounded-xl border border-gray-800/60">
              <span className="text-gray-400 text-[11px]">Total Events</span>
              <p className="text-base font-bold text-white mt-0.5">{latestResult.file.parsed_events_count}</p>
            </div>
            <div className="bg-gray-950 p-3 rounded-xl border border-gray-800/60">
              <span className="text-gray-400 text-[11px]">Actionable Failures</span>
              <p className="text-base font-bold text-red-400 mt-0.5">{latestResult.file.error_events_count}</p>
            </div>
            <div className="bg-gray-950 p-3 rounded-xl border border-gray-800/60">
              <span className="text-gray-400 text-[11px]">Time Span</span>
              <p className="text-xs font-semibold text-gray-300 mt-1 truncate">
                {latestResult.file.time_range_start
                  ? `${latestResult.file.time_range_start.split("T")[1]?.slice(0, 5)} - ${
                      latestResult.file.time_range_end?.split("T")[1]?.slice(0, 5)
                    }`
                  : "N/A"}
              </p>
            </div>
            <div className="bg-gray-950 p-3 rounded-xl border border-gray-800/60">
              <span className="text-gray-400 text-[11px]">Secrets Redacted</span>
              <p className="text-base font-bold text-amber-400 mt-0.5 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>{latestResult.redacted_count}</span>
              </p>
            </div>
          </div>

          {/* Redaction Audit Preview */}
          {latestResult.redaction_samples.length > 0 && (
            <div className="bg-gray-950/80 rounded-xl p-3 border border-amber-900/30 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-amber-300">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sensitive Data Redaction Audit (Secrets Masked Before AI Inference)</span>
              </div>
              <p className="text-[11px] text-gray-400">
                The following credential patterns were detected and securely replaced with redaction tokens. Raw secrets are never sent to models or stored.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
                {latestResult.redaction_samples.map((samp, idx) => (
                  <div key={idx} className="flex items-center space-x-2 py-1 px-2 rounded bg-gray-900 border border-gray-800">
                    <span className="text-gray-500">L{samp.line_number}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                      {samp.pattern_name}
                    </span>
                    <span className="text-gray-300 truncate">{samp.masked_value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Files Section (Tap to analyze) */}
      {logFiles.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Available Ingested Log Files ({logFiles.length})
              </h3>
            </div>
            <span className="text-[11px] text-indigo-400 font-medium">
              💡 Tap any log file below to trigger instant AI problem analysis & remediation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {logFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onTapLogFile(file.id)}
                className="group p-3.5 rounded-xl border border-gray-800/90 hover:border-indigo-500/50 bg-gray-950/70 hover:bg-gray-900/90 cursor-pointer transition-all flex flex-col justify-between space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="truncate pr-2">
                    <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white truncate font-mono">
                      {file.filename}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {file.parsed_events_count} events • {file.total_lines} lines
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                      file.error_events_count > 0
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {file.error_events_count} errors
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Diagnosis & Fixes</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
