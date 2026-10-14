import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { OverviewView } from "./components/dashboard/OverviewView";
import { IngestionView } from "./components/upload/IngestionView";
import { IncidentsView } from "./components/incidents/IncidentsView";
import { LogExplorerView } from "./components/explorer/LogExplorerView";
import { TimelineView } from "./components/timeline/TimelineView";
import { ReportsView } from "./components/reports/ReportsView";
import { SampleScenariosModal } from "./components/common/SampleScenariosModal";
import { FileAIAnalysisModal } from "./components/common/FileAIAnalysisModal";
import type {
  SystemHealth,
  AIHealthStatus,
  Incident,
  IngestionResult,
  LifecycleStatus,
  LogFile,
  FileAIAnalysisResponse,
} from "./types";
import { api } from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const [explorerIncidentFilter, setExplorerIncidentFilter] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);

  // File AI Analysis Modal state (Requirement 4)
  const [fileAnalysisModalOpen, setFileAnalysisModalOpen] = useState(false);
  const [fileAnalysisLoading, setFileAnalysisLoading] = useState(false);
  const [fileAnalysisData, setFileAnalysisData] = useState<FileAIAnalysisResponse | null>(null);

  // Load health, incidents, and files on start
  const refreshHealth = async () => {
    try {
      const health = await api.getHealth();
      setSystemHealth(health);
      setAiHealth(health.ai_status);
    } catch {
      // ignore
    }
  };

  const fetchFiles = async () => {
    try {
      const files = await api.getLogFiles();
      setLogFiles(files);
      if (files.length > 0 && !activeFileId) {
        setActiveFileId(files[0].id);
      }
    } catch {
      // ignore
    }
  };

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        const detail = await api.getIncident(data[0].id);
        setSelectedIncident(detail);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshHealth();
    fetchFiles();
    fetchIncidents();
  }, []);

  const handleSelectIncident = async (id: string) => {
    try {
      const detail = await api.getIncident(id);
      setSelectedIncident(detail);
      setActiveTab("incidents");
    } catch {
      // ignore
    }
  };

  // Requirement 4: After tapping the log files, AI should analyse the log and suggest something related to the problem
  const handleTapLogFile = async (fileId: string) => {
    setActiveFileId(fileId);
    setFileAnalysisModalOpen(true);
    setFileAnalysisLoading(true);
    try {
      const result = await api.getFileAnalysis(fileId);
      setFileAnalysisData(result);
    } catch (e: any) {
      alert(`AI File Analysis error: ${e.message}`);
      setFileAnalysisModalOpen(false);
    } finally {
      setFileAnalysisLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: LifecycleStatus) => {
    try {
      await api.updateIncidentStatus(id, status);
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, lifecycle_status: status } : inc))
      );
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident({ ...selectedIncident, lifecycle_status: status });
      }
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`);
    }
  };

  const handleRunAiAnalysis = async (id: string) => {
    setAnalyzingId(id);
    try {
      await api.runAIIncidentAnalysis(id, true);
      const detail = await api.getIncident(id);
      setSelectedIncident(detail);
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, ...detail } : inc))
      );
    } catch (e: any) {
      alert(`AI Analysis error: ${e.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleUploadSuccess = async (result: IngestionResult) => {
    await fetchFiles();
    await fetchIncidents();
    setActiveFileId(result.file.id);
    setActiveTab("incidents");
  };

  const handleSelectScenario = async (scenario: string) => {
    setSampleLoading(true);
    try {
      const res = await api.loadSampleLogs(scenario);
      await fetchFiles();
      await fetchIncidents();
      if (res?.file?.id) {
        setActiveFileId(res.file.id);
      }
      setSampleModalOpen(false);
      setActiveTab("incidents");
    } catch (e: any) {
      alert(`Failed to load scenario: ${e.message}`);
    } finally {
      setSampleLoading(false);
    }
  };

  const handleNavigateToExplorer = (incidentId?: string) => {
    setExplorerIncidentFilter(incidentId || null);
    setActiveTab("explorer");
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header without Settings tab (Requirement 3) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemHealth={systemHealth}
        aiHealth={aiHealth}
        onRefreshHealth={refreshHealth}
        onOpenSampleModal={() => setSampleModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "overview" && (
          <OverviewView
            incidents={incidents}
            logFiles={logFiles}
            systemHealth={systemHealth}
            onSelectIncident={handleSelectIncident}
            onTapLogFile={handleTapLogFile}
            onNavigateToUpload={() => setActiveTab("upload")}
            onNavigateToTimeline={() => setActiveTab("timeline")}
            onExportReport={() => setActiveTab("reports")}
            onOpenSampleModal={() => setSampleModalOpen(true)}
          />
        )}

        {activeTab === "upload" && (
          <IngestionView
            logFiles={logFiles}
            onUploadSuccess={handleUploadSuccess}
            onOpenSampleModal={() => setSampleModalOpen(true)}
            onNavigateToIncidents={() => setActiveTab("incidents")}
            onNavigateToExplorer={() => setActiveTab("explorer")}
            onTapLogFile={handleTapLogFile}
          />
        )}

        {activeTab === "incidents" && (
          <IncidentsView
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            onStatusChange={handleStatusChange}
            onRunAiAnalysis={handleRunAiAnalysis}
            analyzingId={analyzingId}
            onNavigateToExplorer={handleNavigateToExplorer}
          />
        )}

        {activeTab === "explorer" && (
          <LogExplorerView
            initialIncidentFilter={explorerIncidentFilter}
            initialFileFilter={activeFileId}
            logFiles={logFiles}
            onSelectIncident={handleSelectIncident}
            onTapLogFile={handleTapLogFile}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineView
            incidents={incidents}
            logFiles={logFiles}
            activeFileId={activeFileId}
            onSelectIncident={handleSelectIncident}
            onSelectFile={(fileId) => setActiveFileId(fileId)}
            onNavigateToUpload={() => setActiveTab("upload")}
          />
        )}

        {activeTab === "reports" && (
          <ReportsView
            totalIncidents={incidents.length}
            totalEvents={incidents.reduce((sum, i) => sum + i.occurrence_count, 0)}
          />
        )}
      </main>

      {/* Production Scenarios Modal */}
      <SampleScenariosModal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        onSelectScenario={handleSelectScenario}
        loading={sampleLoading}
      />

      {/* AI Log File Analysis & Problem Suggestions Modal (Requirement 4) */}
      <FileAIAnalysisModal
        isOpen={fileAnalysisModalOpen}
        onClose={() => setFileAnalysisModalOpen(false)}
        loading={fileAnalysisLoading}
        analysisData={fileAnalysisData}
        onInvestigateIncident={handleSelectIncident}
        onExploreFileEvents={(fileId) => {
          setActiveFileId(fileId);
          setActiveTab("explorer");
        }}
      />
    </div>
  );
}

export default App;
