import React, { useState, useEffect } from "react";
import {
  Terminal,
  Search,
  Filter,
  AlertTriangle,
  ChevronDown,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
  Brain,
  Sparkles,
} from "lucide-react";
import type { LogEvent, LogFile } from "../../types";

interface LogExplorerViewProps {
  initialIncidentFilter?: string | null;
  initialFileFilter?: string | null;
  logFiles?: LogFile[];
  onSelectIncident: (id: string) => void;
  onTapLogFile?: (fileId: string) => void;
}

export const LogExplorerView: React.FC<LogExplorerViewProps> = ({
  initialIncidentFilter,
  initialFileFilter,
  logFiles = [],
  onSelectIncident,
  onTapLogFile,
}) => {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [fileFilter, setFileFilter] = useState<string>(initialFileFilter || "");
  const [incidentFilter, setIncidentFilter] = useState<string>(initialIncidentFilter || "");
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("limit", "50");
      if (search) query.set("search", search);
      if (selectedLevel !== "ALL") query.set("level", selectedLevel);
      if (errorsOnly) query.set("is_error", "true");
      if (fileFilter) query.set("file_id", fileFilter);
      if (incidentFilter) query.set("incident_id", incidentFilter);

      const res = await fetch(`/api/logs/events?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.items);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, selectedLevel, errorsOnly, fileFilter, incidentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const currentFile = logFiles.find((f) => f.id === fileFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>Sanitized Log Explorer</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse structured lines, inspect raw exceptions, and trace incident associations.
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-400">
          {fileFilter && onTapLogFile && (
            <button
              onClick={() => onTapLogFile(fileFilter)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Analyze Active File</span>
            </button>
          )}
          <div>
            Showing <span className="text-white font-bold">{events.length}</span> of{" "}
            <span className="text-white font-bold">{total}</span> events
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-3.5 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search message text, exceptions, components, trace IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* File Dropdown */}
            {logFiles.length > 0 && (
              <select
                value={fileFilter}
                onChange={(e) => {
                  setFileFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-gray-950 border border-indigo-500/30 rounded-xl px-2.5 py-1.5 text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Files ({logFiles.length})</option>
                {logFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.filename}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setPage(1);
              }}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setErrorsOnly(!errorsOnly);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                errorsOnly
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-gray-950 text-gray-400 border-gray-800 hover:text-gray-200"
              }`}
            >
              Errors Only
            </button>

            {incidentFilter && (
              <button
                type="button"
                onClick={() => setIncidentFilter("")}
                className="px-2.5 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium hover:bg-indigo-500/20"
              >
                Clear Inc. Filter ✕
              </button>
            )}

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Monospace Log Viewer Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">Line</th>
                <th className="py-2.5 px-3 w-40">Timestamp</th>
                <th className="py-2.5 px-3 w-20 text-center">Level</th>
                <th className="py-2.5 px-3 w-32">Component</th>
                <th className="py-2.5 px-3">Sanitized Message</th>
                <th className="py-2.5 px-3 w-28 text-center">Incident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-sans text-xs">
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-sans text-xs">
                    No log events found matching the criteria.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isErr = ev.is_error || ev.log_level === "ERROR" || ev.log_level === "CRITICAL";
                  return (
                    <React.Fragment key={ev.id}>
                      <tr className={`hover:bg-gray-800/40 transition-colors ${isErr ? "bg-red-950/10" : ""}`}>
                        {/* Line number */}
                        <td className="py-2 px-3 text-center text-gray-500 select-none">
                          L{ev.original_line_number}
                        </td>
                        {/* Timestamp */}
                        <td className="py-2 px-3 text-gray-400 truncate">
                          {ev.timestamp ? ev.timestamp.replace("T", " ").slice(0, 19) : "—"}
                        </td>
                        {/* Level */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ev.log_level === "CRITICAL"
                                ? "bg-red-500/30 text-red-300 border border-red-500/40"
                                : ev.log_level === "ERROR"
                                ? "bg-red-500/20 text-red-400"
                                : ev.log_level === "WARN"
                                ? "bg-amber-500/20 text-amber-400"
                                : ev.log_level === "DEBUG"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            {ev.log_level}
                          </span>
                        </td>
                        {/* Component */}
                        <td className="py-2 px-3 text-indigo-300 truncate font-semibold">
                          {ev.component || "—"}
                        </td>
                        {/* Message */}
                        <td className="py-2 px-3 text-gray-200 break-all">
                          <div className="flex items-start justify-between gap-2">
                            <span>{ev.message}</span>
                            {ev.stack_trace && (
                              <button
                                onClick={() =>
                                  setExpandedTrace(expandedTrace === ev.id ? null : ev.id)
                                }
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline shrink-0 font-sans"
                              >
                                {expandedTrace === ev.id ? "Hide Trace" : "Trace"}
                              </button>
                            )}
                          </div>
                        </td>
                        {/* Incident Link */}
                        <td className="py-2 px-3 text-center">
                          {ev.incident_id ? (
                            <button
                              onClick={() => onSelectIncident(ev.incident_id!)}
                              className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 font-sans font-semibold inline-flex items-center space-x-1"
                            >
                              <span>Inc-{ev.incident_id.slice(0, 4)}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ) : (
                            <span className="text-gray-600 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Traceback Row */}
                      {expandedTrace === ev.id && ev.stack_trace && (
                        <tr>
                          <td colSpan={6} className="p-3 bg-black/90 border-b border-gray-800">
                            <pre className="text-[10px] text-red-300 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                              {ev.stack_trace}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 font-sans">
          <span>
            Page {page} of {Math.max(Math.ceil(total / 50), 1)}
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-800"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 50)}
              className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
