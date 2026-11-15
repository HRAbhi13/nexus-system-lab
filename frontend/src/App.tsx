import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/views/OverviewView';
import { FileManagerView } from './components/views/FileManagerView';
import { DuplicateDetectionView } from './components/views/DuplicateDetectionView';
import { CompressionAdvisorView } from './components/views/CompressionAdvisorView';
import { StorageOptimizerView } from './components/views/StorageOptimizerView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { SettingsView } from './components/views/SettingsView';
import { FileUploadModal } from './components/common/FileUploadModal';
import { NotificationToast, ToastMessage } from './components/common/NotificationToast';
import { nexusApi } from './services/api';
import { ActiveNavTab, StorageFile } from './types';

/**
 * Format raw bytes into human-readable representation
 */
const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'B'}`;
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('overview');

  // Dynamic badge and health counts powered by live backend telemetry
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [compressionCount, setCompressionCount] = useState<number>(0);
  const [recommendationCount, setRecommendationCount] = useState<number>(0);
  const [healthScore, setHealthScore] = useState<number | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fetch live global telemetry for sidebar badges and header health
  useEffect(() => {
    let isMounted = true;
    async function loadGlobalTelemetry() {
      try {
        const [dash, roi] = await Promise.all([
          nexusApi.getStorageDashboard(),
          nexusApi.getOptimizationRoi(),
        ]);
        if (!isMounted) return;

        setDuplicateCount(roi.duplicate_files_count || 0);
        setCompressionCount(roi.compressible_files_count || 0);
        setRecommendationCount(roi.tier_transition_candidates_count || 0);

        if (dash.overview.total_files === 0) {
          setHealthScore(100);
        } else {
          const dupPenalty = (dash.overview.duplicate_volume_percentage || 0) * 0.5;
          const savingsPenalty = (roi.overall_projected_savings_percentage || 0) * 0.5;
          const score = Math.max(10, Math.min(100, Math.round(100 - dupPenalty - savingsPenalty)));
          setHealthScore(score);
        }
      } catch {
        if (isMounted) {
          setHealthScore(null);
        }
      }
    }

    loadGlobalTelemetry();
    return () => {
      isMounted = false;
    };
  }, [dataVersion]);

  // Toast notification helper
  const addToast = (type: 'success' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Callback when a real file is ingested via the upload modal
  const handleFileUploaded = (newFile: StorageFile) => {
    setDataVersion((prev) => prev + 1);
    addToast(
      'success',
      newFile.is_duplicate ? 'Duplicate Object Ingested' : 'Storage Object Ingested',
      newFile.is_duplicate
        ? `Uploaded duplicate copy "${newFile.filename}" (${formatBytes(newFile.file_size)}). Linked to master file (ID: ${newFile.original_file_id || 'N/A'}).`
        : `Successfully ingested "${newFile.filename}" (${formatBytes(newFile.file_size)}) to ${newFile.storage_tier} tier.`
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        duplicateCount={duplicateCount}
        compressionCount={compressionCount}
        recommendationCount={recommendationCount}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onNavigateToTab={setActiveTab}
          healthScore={healthScore}
        />

        {/* Dynamic View Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <OverviewView
                key={`overview-${dataVersion}`}
                onNavigate={setActiveTab}
                onOpenUpload={() => setIsUploadModalOpen(true)}
              />
            )}

            {activeTab === 'files' && (
              <FileManagerView
                key={`files-${dataVersion}`}
                onOpenUpload={() => setIsUploadModalOpen(true)}
              />
            )}

            {activeTab === 'duplicates' && (
              <DuplicateDetectionView
                key={`duplicates-${dataVersion}`}
              />
            )}

            {activeTab === 'compression' && (
              <CompressionAdvisorView
                key={`compression-${dataVersion}`}
              />
            )}

            {activeTab === 'optimizer' && (
              <StorageOptimizerView
                key={`optimizer-${dataVersion}`}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView
                key={`analytics-${dataVersion}`}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                key={`settings-${dataVersion}`}
                onSavePreferences={(msg) => addToast('success', 'Preferences Updated', msg)}
              />
            )}
          </div>
        </main>
      </div>

      {/* File Ingest Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileUploaded={handleFileUploaded}
      />

      {/* Floating Notification Toasts */}
      <NotificationToast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};

export default App;
