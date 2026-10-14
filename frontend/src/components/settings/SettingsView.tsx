import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import type { AIHealthStatus, SystemHealth } from "../../types";
import { api } from "../../services/api";

interface SettingsViewProps {
  systemHealth: SystemHealth | null;
  aiHealth: AIHealthStatus | null;
  onRefreshHealth: () => void;
  onDataCleared: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  systemHealth,
  aiHealth,
  onRefreshHealth,
  onDataCleared,
}) => {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleTestAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testAI();
      setTestResult(res.message);
    } catch (e: any) {
      setTestResult(`Test failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to clear all uploaded files, events, and incidents?")) {
      return;
    }
    setClearing(true);
    try {
      await api.clearAllData();
      onDataCleared();
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  };

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const isAiOnline = aiHealth?.status === "connected" && aiHealth?.model_available;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <span>Platform Configuration & AI Runtime Settings</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage local inference providers, connection endpoints, and session data retention.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: AI Runtime Config */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-white">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Local Open-Weight AI Inference (Ollama)</span>
          </div>

          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
              isAiOnline
                ? "bg-emerald-950/30 border-emerald-800 text-emerald-200"
                : "bg-amber-950/30 border-amber-800 text-amber-200"
            }`}
          >
            {isAiOnline ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {isAiOnline ? "Ollama Runtime Connected" : "Ollama Runtime Not Detected"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {aiHealth?.error_message ||
                  "Local open-weight model is pulled and ready for root cause inference."}
              </p>
            </div>
          </div>

          {/* Endpoint Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-800">
              <span className="text-gray-400">Endpoint URL:</span>
              <span className="font-mono text-gray-200">{aiHealth?.endpoint || "http://127.0.0.1:11434"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-800">
              <span className="text-gray-400">Configured Model:</span>
              <span className="font-mono text-indigo-400 font-semibold">{aiHealth?.model || "llama3.2:latest"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-800">
              <span className="text-gray-400">Model Pulled Locally:</span>
              <span className={aiHealth?.model_available ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                {aiHealth?.model_available ? "Yes (Active)" : "No"}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Offline Safe Fallback:</span>
              <span className="text-gray-300">
                {aiHealth?.is_mock_fallback_active ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={handleTestAI}
              disabled={testing}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {testing ? "Testing..." : "Test AI Model Ping"}
            </button>
            <button
              onClick={onRefreshHealth}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {testResult && (
            <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 text-[11px] font-mono text-gray-300">
              {testResult}
            </div>
          )}
        </div>

        {/* Right: Setup Instructions & Data Management */}
        <div className="space-y-4">
          {/* Setup Guide */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Ollama Local Model Setup Guide</span>
            </div>
            <p className="text-xs text-gray-400">
              Run these commands in your local terminal to install and start the open-weight model:
            </p>

            <div className="space-y-2 text-xs font-mono">
              {[
                "brew install ollama",
                "ollama serve",
                `ollama pull ${aiHealth?.model || "llama3.2"}`,
              ].map((cmd, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-950 border border-gray-800 text-cyan-400"
                >
                  <span>{cmd}</span>
                  <button
                    onClick={() => copyToClipboard(cmd)}
                    className="text-gray-500 hover:text-gray-300 p-1"
                    title="Copy command"
                  >
                    {copiedCmd === cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reset / Clear Data */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-red-400">
              <Trash2 className="w-4 h-4" />
              <span>Session Data Management</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Reset your investigation workspace by purging all parsed files, log events, and correlated incidents from the local database.
            </p>
            <button
              onClick={handleClearData}
              disabled={clearing}
              className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/50 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{clearing ? "Clearing..." : "Purge All Workspace Data"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
