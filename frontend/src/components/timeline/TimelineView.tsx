import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  Brain,
  Filter,
  CheckCircle2,
  FileText,
  Layers,
  PlusCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimelineResponse, Incident, LogFile } from "../../types";
import { api } from "../../services/api";

interface TimelineViewProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  logFiles: LogFile[];
  activeFileId: string | null;
  onSelectFile?: (fileId: string) => void;
  onNavigateToUpload?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  incidents,
  onSelectIncident,
  logFiles,
  activeFileId,
  onSelectFile,
  onNavigateToUpload,
}) => {
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>(
    activeFileId || (logFiles.length > 0 ? logFiles[0].id : "")
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Sync with activeFileId prop if changed from outside
  useEffect(() => {
    if (activeFileId) {
      setSelectedFileId(activeFileId);
    }
  }, [activeFileId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const data = await api.getTimeline({
        file_id: selectedFileId || undefined,
        incident_id: selectedIncidentId || undefined,
        severity: severityFilter || undefined,
      });
      setTimelineData(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedFileId, selectedIncidentId, severityFilter]);

  const activeFile = logFiles.find((f) => f.id === selectedFileId);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>Interactive Incident Timeline & Historical Evolution</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Visualizing failure frequency bursts, severity evolution, and spike anomalies dynamically based on your uploaded log files.
          </p>
        </div>

        {/* Observation Range Badge */}
        {timelineData?.has_data && (
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                timelineData.covers_target_range
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
              }`}
            >
              {timelineData.covers_target_range
                ? `Observation Window: ${timelineData.duration_hours}h Span`
                : `Span: ${timelineData.duration_hours || 0}h Span`}
            </span>
          </div>
        )}
      </div>

      {/* Uploaded Log File Selector Toolbar (Requirement 2) */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* File Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-300 font-semibold flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Log File:</span>
            </span>
            <select
              value={selectedFileId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedFileId(newId);
                if (onSelectFile) onSelectFile(newId);
              }}
              className="bg-gray-950 border border-indigo-500/40 rounded-xl px-3 py-1.5 text-indigo-200 font-medium focus:outline-none focus:border-indigo-400 shadow-inner"
            >
              <option value="">All Uploaded Files ({logFiles.length})</option>
              {logFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.filename} ({f.parsed_events_count} events{f.error_events_count > 0 ? `, ${f.error_events_count} errs` : ""})
                </option>
              ))}
            </select>
          </div>

          {/* Incident Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Incident:</span>
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Incidents</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.title.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Mild">Mild</option>
            </select>
          </div>
        </div>

        {/* Selected file badge or CTA */}
        {activeFile ? (
          <div className="text-[11px] text-gray-400 bg-gray-950 px-3 py-1 rounded-xl border border-gray-800">
            Log Scope: <span className="text-gray-200 font-mono font-semibold">{activeFile.filename}</span> (
            {activeFile.parsed_events_count} events, {activeFile.error_events_count} errors)
          </div>
        ) : logFiles.length === 0 && onNavigateToUpload ? (
          <button
            onClick={onNavigateToUpload}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Upload Log File</span>
          </button>
        ) : null}
      </div>

      {/* AI Evolution Summary Card */}
      {timelineData?.ai_evolution_summary && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>
              {activeFile
                ? `AI Sequence & Frequency Analysis for ${activeFile.filename}`
                : "AI Incident Sequence & Frequency Evolution Summary"}
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed bg-gray-950 p-3 rounded-xl border border-gray-800">
            {timelineData.ai_evolution_summary}
          </p>
        </div>
      )}

      {/* Chart Card */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {activeFile
                ? `Timeline Event Frequency: ${activeFile.filename}`
                : "Event Frequency by Severity Bucket"}
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-gray-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
              <span>High</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
              <span>Mild</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400">
            Calculating historical timeline buckets for {activeFile?.filename || "logs"}...
          </div>
        ) : !timelineData?.has_data || timelineData.buckets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
            <Clock className="w-8 h-8 text-gray-600" />
            <p className="text-xs text-gray-400">
              {logFiles.length === 0
                ? "No log files have been uploaded yet."
                : `No timestamped log events found for ${activeFile?.filename || "selected filters"}.`}
            </p>
            {onNavigateToUpload && logFiles.length === 0 && (
              <button
                onClick={onNavigateToUpload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Ingest Log File to Generate Timeline
              </button>
            )}
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData.buckets} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  dy={6}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl shadow-2xl text-xs space-y-1 font-sans">
                          <p className="font-bold text-gray-200">{data.timestamp}</p>
                          <div className="space-y-0.5 text-[11px]">
                            <p className="text-red-400">Critical: {data.critical_count}</p>
                            <p className="text-orange-400">High: {data.high_count}</p>
                            <p className="text-yellow-400">Mild: {data.mild_count}</p>
                            <p className="text-gray-300 font-semibold border-t border-gray-800 pt-1">
                              Total: {data.total_events} events
                            </p>
                          </div>
                          {data.is_spike && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold block mt-1">
                              ⚠️ Frequency Burst Spike
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="critical_count" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="high_count" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="mild_count" stackId="a" fill="#eab308" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
