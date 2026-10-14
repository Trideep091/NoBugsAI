import React from "react";
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Table,
  Layers,
  History,
  Lock,
} from "lucide-react";
import { api } from "../../services/api";

interface ReportsViewProps {
  totalIncidents: number;
  totalEvents: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  totalIncidents,
  totalEvents,
}) => {
  const handleDownload = () => {
    window.location.href = api.getExcelExportUrl();
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Investigation Reports & Excel Export</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Export structured investigation findings into a formatted multi-sheet Excel workbook (.xlsx).
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download Investigation Workbook (.xlsx)</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sheet 1 Card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-indigo-300">
            <Table className="w-4 h-4 text-indigo-400" />
            <span>Worksheet 1: Incident Summary</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Executive problem summaries, AI root-cause hypotheses, severity ratings, specific remediation plans, and verification steps.
          </p>
          <div className="text-[11px] text-gray-500 font-mono space-y-1 pt-2 border-t border-gray-800">
            <p>• Incident ID & Title</p>
            <p>• Severity & Lifecycle Status</p>
            <p>• Root-Cause Hypothesis & Confidence</p>
            <p>• Actionable Remediation Steps</p>
          </div>
        </div>

        {/* Sheet 2 Card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-blue-300">
            <History className="w-4 h-4 text-blue-400" />
            <span>Worksheet 2: Event Timeline</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Chronological audit trail of all detected failures, downstream symptoms, line numbers, and component tags.
          </p>
          <div className="text-[11px] text-gray-500 font-mono space-y-1 pt-2 border-t border-gray-800">
            <p>• Event ID & UTC Timestamp</p>
            <p>• Associated Incident Linkage</p>
            <p>• Source Filename & Line Number</p>
            <p>• Failure Classification</p>
          </div>
        </div>

        {/* Sheet 3 Card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-emerald-300">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Worksheet 3: Original Log Events</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Sanitized record of all parsed events preserving original line numbering and context without leaking credentials.
          </p>
          <div className="text-[11px] text-gray-500 font-mono space-y-1 pt-2 border-t border-gray-800">
            <p>• Filename & Line Number</p>
            <p>• Sanitized Log Level</p>
            <p>• Sanitized Message Content</p>
            <p>• Associated Incident ID</p>
          </div>
        </div>
      </div>

      {/* Security and Data Privacy Panel */}
      <div className="bg-gray-950 rounded-2xl p-5 border border-gray-800 space-y-3">
        <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security & Data Integrity Assurances</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
          <div className="space-y-1">
            <p className="font-semibold text-gray-300 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sensitive Credential Redaction</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              All AWS keys, OpenAI tokens, Stripe secrets, JWTs, and passwords are fully masked in the exported spreadsheet.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-300 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Spreadsheet Formula Injection Defense</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Cells containing formula prefixes (=, +, -, @) are sanitized with leading apostrophes to protect analysts from CSV/Excel code execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
