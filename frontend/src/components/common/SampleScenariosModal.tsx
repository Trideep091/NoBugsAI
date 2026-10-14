import React from "react";
import { Database, ShieldAlert, Cpu, Radio, Sparkles } from "lucide-react";

interface SampleScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: string) => void;
  loading: boolean;
}

export const SampleScenariosModal: React.FC<SampleScenariosModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
  loading,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: "postgres_pool",
      title: "PostgreSQL Connection Pool Exhaustion & 504 Cascade",
      icon: Database,
      badge: "Critical Outage",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
      description:
        "Long-running queries exhaust the 100-connection database pool, cascading into upstream HTTP 504 Gateway Timeouts across checkout services. Contains test credentials and database connection strings to verify redaction.",
      timespan: "3.5 Hours span",
    },
    {
      id: "microservices_cascade",
      title: "Authentication Token Expiration & Key Rotation Storm",
      icon: ShieldAlert,
      badge: "High Severity",
      badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      description:
        "Key rotation sync delay causes token signature rejections (401 Unauthorized) cascading across order-processor and inventory-service microservices with retry budget exhaustion.",
      timespan: "3.5 Hours span",
    },
    {
      id: "oom_crash",
      title: "Background Worker OutOfMemory Crash (OOMKilled)",
      icon: Cpu,
      badge: "Critical Crash",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
      description:
        "Unbounded batch transaction ETL job exhausts 2GB JVM heap, triggering java.lang.OutOfMemoryError and Linux cgroup OOM termination (exit code 137).",
      timespan: "3.5 Hours span",
    },
    {
      id: "webhook_crypto",
      title: "Stripe Payment Webhook Cryptographic Verification Drift",
      icon: Radio,
      badge: "High Severity",
      badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      description:
        "System clock drift causes Stripe webhook signature timestamp validation failures, sparking an exponential retry storm from payment gateways.",
      timespan: "3.5 Hours span",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Load Realistic Production Incident Scenarios</h3>
              <p className="text-xs text-gray-400">
                Pre-configured multi-service logs covering real-world architectural failures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                onClick={() => !loading && onSelectScenario(sc.id)}
                className="group p-4 rounded-xl border border-gray-800 hover:border-indigo-500/50 bg-gray-950/60 hover:bg-gray-900/80 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{sc.timespan}</span>
                  </div>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <div className="p-2 rounded-lg bg-gray-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white leading-tight">
                      {sc.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">{sc.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-800/60 flex justify-end">
                  <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium">
                    Load & Analyze →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="text-center py-2 text-xs text-indigo-400 font-medium animate-pulse">
            Ingesting, sanitizing secrets, and correlating incident telemetry...
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
