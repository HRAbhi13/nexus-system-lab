import React, { useState } from 'react';
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
import { 
  MOCK_FILES, 
  MOCK_DUPLICATE_GROUPS, 
  MOCK_COMPRESSION_CANDIDATES, 
  MOCK_TIER_RECOMMENDATIONS, 
  formatBytes 
} from './data/mockData';
import { ActiveNavTab, StorageFile, StorageTier } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('overview');
  const [files, setFiles] = useState<StorageFile[]>(MOCK_FILES);
  const [duplicateGroups, setDuplicateGroups] = useState(MOCK_DUPLICATE_GROUPS);
  const [compressionCandidates, setCompressionCandidates] = useState(MOCK_COMPRESSION_CANDIDATES);
  const [tierRecommendations, setTierRecommendations] = useState(MOCK_TIER_RECOMMENDATIONS);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  // Actions
  const handleFileUploaded = (newFile: StorageFile) => {
    setFiles((prev) => [newFile, ...prev]);
    addToast(
      'success',
      'Blob Object Ingested',
      `Simulated upload of "${newFile.filename}" (${formatBytes(newFile.file_size)}) to ${newFile.storage_tier} tier.`
    );
  };

  const handleDeleteFile = (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setDuplicateGroups((prev) => 
      prev.map((g) => ({
        ...g,
        duplicates: g.duplicates.filter((d) => d.id !== fileId),
      })).filter((g) => g.duplicates.length > 0)
    );
    setCompressionCandidates((prev) => prev.filter((c) => c.file.id !== fileId));
    setTierRecommendations((prev) => prev.filter((r) => r.file.id !== fileId));

    addToast(
      'info',
      'Storage Object Deleted',
      `Deleted file "${target?.filename || fileId}". Reclaimed ${target ? formatBytes(target.file_size) : 'storage'}.`
    );
  };

  const handleMigrateTier = (fileId: string, newTier: StorageTier) => {
    setFiles((prev) => 
      prev.map((f) => f.id === fileId ? { ...f, storage_tier: newTier } : f)
    );
    setTierRecommendations((prev) => prev.filter((r) => r.file.id !== fileId));
    addToast(
      'success',
      'Storage Tier Transitioned',
      `Object successfully migrated to ${newTier} storage tier.`
    );
  };

  const handleBatchMigrateTier = (fileIds: string[], newTier: StorageTier) => {
    setFiles((prev) => 
      prev.map((f) => fileIds.includes(f.id) ? { ...f, storage_tier: newTier } : f)
    );
    setTierRecommendations((prev) => prev.filter((r) => !fileIds.includes(r.file.id)));
    addToast(
      'success',
      'Batch Tier Migration',
      `Migrated ${fileIds.length} objects to ${newTier} storage tier.`
    );
  };

  const handleBatchDeleteFiles = (fileIds: string[]) => {
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setDuplicateGroups((prev) => 
      prev.map((g) => ({
        ...g,
        duplicates: g.duplicates.filter((d) => !fileIds.includes(d.id)),
      })).filter((g) => g.duplicates.length > 0)
    );
    setCompressionCandidates((prev) => prev.filter((c) => !fileIds.includes(c.file.id)));
    setTierRecommendations((prev) => prev.filter((r) => !fileIds.includes(r.file.id)));
    addToast(
      'info',
      'Batch Deletion Completed',
      `Deleted ${fileIds.length} file objects from storage.`
    );
  };

  const handleDeleteSingleDuplicate = (fileId: string, hash: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setDuplicateGroups((prev) =>
      prev.map((g) => {
        if (g.hash !== hash) return g;
        const updatedDuplicates = g.duplicates.filter((d) => d.id !== fileId);
        const wasted = updatedDuplicates.reduce((sum, d) => sum + d.file_size, 0);
        return {
          ...g,
          duplicates: updatedDuplicates,
          total_wasted_bytes: wasted,
          count: updatedDuplicates.length + 1,
        };
      }).filter((g) => g.duplicates.length > 0)
    );
    addToast('info', 'Duplicate Copy Removed', 'Specific redundant replica was purged.');
  };

  const handleDeduplicateGroup = (hash: string) => {
    const group = duplicateGroups.find((g) => g.hash === hash);
    if (!group) return;

    const dupIds = group.duplicates.map((d) => d.id);
    setFiles((prev) => prev.filter((f) => !dupIds.includes(f.id)));
    setDuplicateGroups((prev) => prev.filter((g) => g.hash !== hash));

    addToast(
      'success',
      'Cluster Deduplicated',
      `Purged ${dupIds.length} redundant copies. Reclaimed ${formatBytes(group.total_wasted_bytes)} of storage.`
    );
  };

  const handleDeduplicateAll = () => {
    const allDupIds = duplicateGroups.flatMap((g) => g.duplicates.map((d) => d.id));
    const totalWasted = duplicateGroups.reduce((acc, g) => acc + g.total_wasted_bytes, 0);

    setFiles((prev) => prev.filter((f) => !allDupIds.includes(f.id)));
    setDuplicateGroups([]);

    addToast(
      'success',
      'Global Deduplication Complete',
      `Purged all ${allDupIds.length} redundant copies across all clusters. Reclaimed ${formatBytes(totalWasted)}.`
    );
  };

  const handleCompressCandidate = (fileId: string) => {
    const candidate = compressionCandidates.find((c) => c.file.id === fileId);
    if (!candidate) return;

    // Simulate shrinking the file in state
    setFiles((prev) => 
      prev.map((f) => 
        f.id === fileId 
          ? { ...f, file_size: candidate.estimated_compressed_bytes } 
          : f
      )
    );
    setCompressionCandidates((prev) => prev.filter((c) => c.file.id !== fileId));

    addToast(
      'success',
      'Object Compressed',
      `Applied ${candidate.recommended_algorithm} compression. Saved ${formatBytes(candidate.estimated_saved_bytes)}.`
    );
  };

  const handleCompressAll = () => {
    const totalSaved = compressionCandidates.reduce((acc, c) => acc + c.estimated_saved_bytes, 0);
    setFiles((prev) => 
      prev.map((f) => {
        const cand = compressionCandidates.find((c) => c.file.id === f.id);
        return cand ? { ...f, file_size: cand.estimated_compressed_bytes } : f;
      })
    );
    setCompressionCandidates([]);

    addToast(
      'success',
      'Batch Compression Completed',
      `Successfully compressed all candidates. Reclaimed ${formatBytes(totalSaved)} storage capacity.`
    );
  };

  const handleApplyAllRecommendations = () => {
    setFiles((prev) => 
      prev.map((f) => {
        const rec = tierRecommendations.find((r) => r.file.id === f.id);
        return rec ? { ...f, storage_tier: rec.recommended_tier } : f;
      })
    );
    const count = tierRecommendations.length;
    setTierRecommendations([]);

    addToast(
      'success',
      'All Lifecycle Rules Applied',
      `Migrated ${count} objects to optimal WARM, COLD and ARCHIVE tiers based on inactivity.`
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        duplicateCount={duplicateGroups.length}
        compressionCount={compressionCandidates.length}
        recommendationCount={tierRecommendations.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onNavigateToTab={setActiveTab}
          healthScore={79}
        />

        {/* Dynamic View Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <OverviewView 
                onNavigate={setActiveTab} 
                onOpenUpload={() => setIsUploadModalOpen(true)} 
              />
            )}

            {activeTab === 'files' && (
              <FileManagerView
                files={files}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                onDeleteFile={handleDeleteFile}
                onMigrateTier={handleMigrateTier}
                onBatchDeleteFiles={handleBatchDeleteFiles}
                onBatchMigrateTier={handleBatchMigrateTier}
              />
            )}

            {activeTab === 'duplicates' && (
              <DuplicateDetectionView
                groups={duplicateGroups}
                onDeduplicateGroup={handleDeduplicateGroup}
                onDeduplicateAll={handleDeduplicateAll}
                onDeleteSingleDuplicate={handleDeleteSingleDuplicate}
              />
            )}

            {activeTab === 'compression' && (
              <CompressionAdvisorView
                candidates={compressionCandidates}
                onCompressCandidate={handleCompressCandidate}
                onCompressAll={handleCompressAll}
              />
            )}

            {activeTab === 'optimizer' && (
              <StorageOptimizerView
                recommendations={tierRecommendations}
                onApplyRecommendation={handleMigrateTier}
                onApplyAllRecommendations={handleApplyAllRecommendations}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsView />}

            {activeTab === 'settings' && (
              <SettingsView 
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
