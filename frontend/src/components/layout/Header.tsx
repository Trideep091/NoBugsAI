import React, { useState } from "react";
import {
  Activity,
  Cpu,
  FileText,
  AlertTriangle,
  Clock,
  Download,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RefreshCw,
} from "lucide-react";
import type { AIHealthStatus, SystemHealth } from "../../types";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemHealth: SystemHealth | null;
  aiHealth: AIHealthStatus | null;
  onRefreshHealth: () => void;
  onOpenSampleModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemHealth,
  aiHealth,
  onRefreshHealth,
  onOpenSampleModal,
}) => {
  const [showAiModal, setShowAiModal] = useState(false);

  const isAiOnline = aiHealth?.status === "connected" && aiHealth?.model_available;
  const isMockActive = aiHealth?.is_mock_fallback_active;

  const navItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "upload", label: "Ingest Logs", icon: FileText },
    { id: "incidents", label: "Incidents", icon: AlertTriangle },
    { id: "explorer", label: "Log Explorer", icon: Terminal },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "reports", label: "Reports & Export", icon: Download },
  ];

  return (
    <>
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("overview")}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">NoBugs</span>
                <span className="text-xs px-2 py-0.5 font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                  AI Core
                </span>
              </div>
              <p className="text-[10px] text-gray-400 -mt-0.5 tracking-wide">Root-Cause Analysis Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Quick Demo Sample Logs button */}
            <button
              onClick={onOpenSampleModal}
              className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center space-x-1.5 transition-colors"
              title="Load realistic production incident log scenarios"
            >
              <span>Load Scenarios</span>
            </button>

            {/* AI Status Pill */}
            <button
              onClick={() => setShowAiModal(true)}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isAiOnline
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/40"
                  : isMockActive
                  ? "bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/40"
                  : "bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAiOnline ? "bg-emerald-400 animate-pulse" : isMockActive ? "bg-amber-400" : "bg-rose-400"
                }`}
              />
              <span className="hidden sm:inline">
                {isAiOnline
                  ? `Ollama: ${aiHealth?.model}`
                  : isMockActive
                  ? "Offline AI Fallback"
                  : "Ollama Offline"}
              </span>
              <HelpCircle className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Refresh */}
            <button
              onClick={onRefreshHealth}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh connection status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* AI Status & Setup Instructions Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isAiOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">AI Inference Runtime Status</h3>
                  <p className="text-xs text-gray-400">
                    Configured for local open-weight inference via Ollama
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status banner */}
              <div
                className={`p-3 rounded-xl border flex items-start space-x-3 ${
                  isAiOnline
                    ? "bg-emerald-950/30 border-emerald-800 text-emerald-200"
                    : "bg-amber-950/30 border-amber-800 text-amber-200"
                }`}
              >
                {isAiOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {isAiOnline
                      ? "Ollama is Connected & Ready"
                      : "Ollama Local Service Unreachable"}
                  </p>
                  <p className="text-xs opacity-90 mt-1">
                    {aiHealth?.error_message ||
                      "Local Ollama inference daemon is connected and active model is loaded."}
                  </p>
                </div>
              </div>

              {/* Specs */}
              <div className="bg-gray-950 rounded-xl p-3 border border-gray-800 space-y-2">
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Endpoint:</span>
                  <span className="font-mono text-gray-200">{aiHealth?.endpoint || "http://127.0.0.1:11434"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Configured Model:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{aiHealth?.model || "llama3.2:latest"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Model Pulled Locally:</span>
                  <span className={aiHealth?.model_available ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                    {aiHealth?.model_available ? "Yes (Ready)" : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Database:</span>
                  <span className="text-emerald-400 font-mono">{systemHealth?.database || "sqlite (healthy)"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Platform Version:</span>
                  <span className="text-gray-300 font-mono">v{systemHealth?.version || "0.1.0"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Offline Heuristic Fallback:</span>
                  <span className="text-gray-300">
                    {isMockActive ? "Active (Deterministic Safe Analysis)" : "Disabled"}
                  </span>
                </div>
              </div>

              {/* Instructions if offline */}
              {!isAiOnline && (
                <div className="space-y-2">
                  <p className="font-medium text-gray-300">How to start Ollama locally:</p>
                  <div className="bg-black/90 p-3 rounded-xl border border-gray-800 font-mono text-[11px] text-gray-300 space-y-1">
                    <p className="text-gray-500"># 1. Install Ollama (macOS)</p>
                    <p className="text-cyan-400">brew install ollama</p>
                    <p className="text-gray-500 mt-2"># 2. Start Ollama daemon</p>
                    <p className="text-cyan-400">ollama serve</p>
                    <p className="text-gray-500 mt-2"># 3. Pull the open-weight model</p>
                    <p className="text-cyan-400">ollama pull {aiHealth?.model || "llama3.2"}</p>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Note: While Ollama is offline, NoBugs AI operates in <strong>Offline Heuristic Mode</strong> so you can inspect, ingest logs, correlate incidents, and export reports without interruption.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    onRefreshHealth();
                    setShowAiModal(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
