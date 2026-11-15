import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Copy,
  Trash2,
  CheckCircle2,
  Hash,
  ShieldCheck,
  Search,
  Eye,
  X,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { DuplicateGroup, StorageFile, FileCategory, StorageTier } from '../../types';
import { TierBadge } from '../common/TierBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { formatBytes, formatCurrency, formatDate } from '../../data/mockData';
import {
  nexusApi,
  BackendDuplicateAuditReport,
  BackendDuplicateCluster,
  BackendFileMetadata,
  BackendOptimizationRoi
} from '../../services/api';

interface DuplicateDetectionViewProps {
  groups?: DuplicateGroup[];
  onDeduplicateGroup?: (hash: string) => void;
  onDeduplicateAll?: () => void;
  onDeleteSingleDuplicate?: (fileId: string, hash: string) => void;
}

/**
 * Maps BackendFileMetadata from FastAPI response to frontend StorageFile type
 */
const mapBackendFileToStorageFile = (bf: BackendFileMetadata): StorageFile => {
  let inactivityDays = 0;
  if (bf.last_accessed_timestamp) {
    const lastAccessTime = new Date(bf.last_accessed_timestamp).getTime();
    if (!isNaN(lastAccessTime)) {
      inactivityDays = Math.max(0, Math.floor((Date.now() - lastAccessTime) / (1000 * 60 * 60 * 24)));
    }
  }

  const validCategories: FileCategory[] = [
    'Document', 'Image', 'Video', 'Audio', 'Archive', 'Code', 'Data', 'Other'
  ];
  const matchedCategory = validCategories.find(
    (c) => c.toLowerCase() === (bf.category || '').toLowerCase()
  ) || 'Other';

  const validTiers: StorageTier[] = ['HOT', 'WARM', 'COLD', 'ARCHIVE'];
  const upperTier = (bf.storage_tier || 'HOT').toUpperCase();
  const matchedTier: StorageTier = validTiers.includes(upperTier as StorageTier)
    ? (upperTier as StorageTier)
    : 'HOT';

  return {
    id: String(bf.id),
    filename: bf.filename,
    file_size: bf.file_size_bytes,
    mime_type: bf.mime_type || 'application/octet-stream',
    category: matchedCategory,
    storage_tier: matchedTier,
    sha256_hash: bf.sha256_hash,
    is_duplicate: Boolean(bf.is_duplicate),
    original_file_id: bf.original_file_id ? String(bf.original_file_id) : null,
    created_at: bf.upload_timestamp,
    last_accessed_at: bf.last_accessed_timestamp,
    inactivity_days: inactivityDays,
  };
};

/**
 * Maps BackendDuplicateCluster to DuplicateGroup type
 */
const mapBackendClusterToGroup = (cluster: BackendDuplicateCluster): DuplicateGroup => {
  return {
    hash: cluster.sha256_hash,
    original_file: mapBackendFileToStorageFile(cluster.master_file),
    duplicates: (cluster.duplicate_files || []).map(mapBackendFileToStorageFile),
    total_wasted_bytes: cluster.wasted_bytes,
    count: cluster.file_count,
  };
};

export const DuplicateDetectionView: React.FC<DuplicateDetectionViewProps> = ({
  groups: _propGroups,
  onDeduplicateGroup,
  onDeduplicateAll,
  onDeleteSingleDuplicate,
}): React.ReactElement => {
  // Live backend data state
  const [report, setReport] = useState<BackendDuplicateAuditReport | null>(null);
  const [roi, setRoi] = useState<BackendOptimizationRoi | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Search & inspect state
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingGroup, setInspectingGroup] = useState<DuplicateGroup | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch duplicate audit and ROI from FastAPI backend
  const fetchDuplicateData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [auditData, roiData] = await Promise.all([
        nexusApi.auditDuplicates(),
        nexusApi.getOptimizationRoi().catch(() => null),
      ]);
      setReport(auditData);
      setRoi(roiData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to FastAPI duplicate detection service.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuplicateData();
  }, [fetchDuplicateData]);

  // Derived duplicate groups from backend report
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    if (!report || !report.clusters) return [];
    return report.clusters.map(mapBackendClusterToGroup);
  }, [report]);

  // Filter clusters by search query
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return duplicateGroups;
    const lower = searchTerm.toLowerCase();
    return duplicateGroups.filter((g) => {
      const matchHash = g.hash.toLowerCase().includes(lower);
      const matchOriginal = g.original_file.filename.toLowerCase().includes(lower);
      const matchDuplicates = g.duplicates.some((d) =>
        d.filename.toLowerCase().includes(lower)
      );
      return matchHash || matchOriginal || matchDuplicates;
    });
  }, [duplicateGroups, searchTerm]);

  // Real backend metrics
  const totalFilesAnalyzed = report?.total_files_analyzed ?? 0;
  const duplicateFilesCount = report?.duplicate_files_count ?? 0;
  const duplicateClustersCount = report?.duplicate_clusters_count ?? 0;
  const totalWastedBytes = report?.total_wasted_bytes ?? 0;
  const monthlySavings = roi?.deduplication_estimated_savings_spend;

  // Single duplicate deletion (strictly preserves canonical master file)
  const handleDeleteSingleDuplicate = async (fileId: string, hash: string) => {
    const numId = Number(fileId);
    if (isNaN(numId)) return;

    setIsDeleting(true);
    setActionNotice(null);
    try {
      await nexusApi.deleteFile(numId);
      setActionNotice({
        type: 'success',
        message: `Successfully removed redundant duplicate copy (ID: ${fileId}). Canonical master file preserved.`,
      });
      onDeleteSingleDuplicate?.(fileId, hash);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete redundant duplicate copy.';
      setActionNotice({
        type: 'error',
        message,
      });
    } finally {
      setIsDeleting(false);
      await fetchDuplicateData();
    }
  };

  // Cluster deduplication (preserves master file, purges all duplicates)
  const handleDeduplicateCluster = (hash: string) => {
    const targetGroup = duplicateGroups.find((g) => g.hash === hash);
    if (!targetGroup || targetGroup.duplicates.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Deduplicate Cluster',
      message: `Are you sure you want to purge all ${targetGroup.duplicates.length} redundant copies in this cluster? The primary canonical file ("${targetGroup.original_file.filename}") will be kept safe.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsDeleting(true);
        setActionNotice(null);

        let successCount = 0;
        let failCount = 0;

        for (const dup of targetGroup.duplicates) {
          const numId = Number(dup.id);
          if (!isNaN(numId)) {
            try {
              await nexusApi.deleteFile(numId);
              successCount++;
            } catch (err: unknown) {
              console.error(`Failed to delete duplicate file ${dup.id}:`, err);
              failCount++;
            }
          }
        }

        if (failCount > 0) {
          setActionNotice({
            type: 'warning',
            message: `Purged ${successCount} duplicate files with ${failCount} deletion failure(s). Canonical master preserved.`,
          });
        } else {
          setActionNotice({
            type: 'success',
            message: `Cluster deduplicated successfully! Purged ${successCount} redundant copies. Reclaimed ${formatBytes(targetGroup.total_wasted_bytes)}.`,
          });
        }

        onDeduplicateGroup?.(hash);
        setIsDeleting(false);
        await fetchDuplicateData();
      },
    });
  };

  // Bulk deduplication of all clusters (preserves master files)
  const handleDeduplicateAll = () => {
    if (duplicateGroups.length === 0 || duplicateFilesCount === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Purge All Redundant Copies',
      message: `Are you sure you want to delete all ${duplicateFilesCount} redundant copies across all ${duplicateClustersCount} clusters? Master canonical files will be strictly preserved.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsDeleting(true);
        setActionNotice(null);

        const allDuplicates = duplicateGroups.flatMap((g) => g.duplicates);
        let successCount = 0;
        let failCount = 0;

        for (const dup of allDuplicates) {
          const numId = Number(dup.id);
          if (!isNaN(numId)) {
            try {
              await nexusApi.deleteFile(numId);
              successCount++;
            } catch (err: unknown) {
              console.error(`Failed to delete duplicate file ${dup.id}:`, err);
              failCount++;
            }
          }
        }

        if (failCount > 0) {
          setActionNotice({
            type: 'warning',
            message: `Batch deduplication completed: ${successCount} purged, ${failCount} failed. All canonical master files preserved.`,
          });
        } else {
          setActionNotice({
            type: 'success',
            message: `Global deduplication complete! Successfully purged ${successCount} redundant copies across all clusters. Reclaimed ${formatBytes(totalWastedBytes)}.`,
          });
        }

        onDeduplicateAll?.();
        setIsDeleting(false);
        await fetchDuplicateData();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Error State Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">Duplicate Telemetry Unreachable</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              <p className="text-[11px] text-rose-500 mt-1">
                Please verify that the FastAPI backend server is running at <code className="font-mono bg-rose-100/60 px-1 py-0.5 rounded">http://127.0.0.1:8000</code>.
              </p>
            </div>
          </div>
          <button
            onClick={fetchDuplicateData}
            disabled={isLoading || isDeleting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Retry Audit</span>
          </button>
        </div>
      )}

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 animate-in fade-in ${actionNotice.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : actionNotice.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${actionNotice.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
              {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <p className="text-xs font-medium leading-relaxed">{actionNotice.message}</p>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Deduplication Summary */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-navy-900 rounded-2xl p-6 text-white border border-amber-500/30 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SHA-256 Bit-Level Verification</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Cryptographic Duplicate Clusters
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Files are verified through chunked 64 KB streaming SHA-256 cryptographic hashing. Exact hash identity guarantees duplicate safety without false positives. Reclaim <span className="text-amber-400 font-bold">{formatBytes(totalWastedBytes)}</span> by purging redundant copies while strictly preserving canonical primary objects.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={handleDeduplicateAll}
              disabled={isLoading || isDeleting || duplicateFilesCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/25"
            >
              {isDeleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Purge All Redundant Copies</span>
            </button>
            {monthlySavings !== undefined && monthlySavings !== null && (
              <span className="text-[11px] text-slate-400">
                Backend Estimated Monthly Savings:{' '}
                <span className="text-emerald-400 font-mono font-bold">
                  ~{formatCurrency(monthlySavings)}/mo
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Identified Duplicate Clusters</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {isLoading ? '...' : duplicateClustersCount}
            </span>
            <span className="text-xs text-slate-500">Unique cryptographic hashes</span>
          </div>
        </div>

        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Redundant Copies Count</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {isLoading ? '...' : duplicateFilesCount}
            </span>
            <span className="text-xs text-slate-500">
              of {isLoading ? '...' : totalFilesAnalyzed} analyzed objects
            </span>
          </div>
        </div>

        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Reclaimable Storage Capacity</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {isLoading ? '...' : formatBytes(totalWastedBytes)}
            </span>
            <span className="text-xs text-slate-500">Recoverable cloud storage</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar & Refresh */}
      <div className="nexus-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clusters by filename or SHA-256 hash prefix..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors"
            >
              Clear Filter
            </button>
          )}

          <button
            onClick={fetchDuplicateData}
            disabled={isLoading || isDeleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition-all disabled:opacity-50"
            title="Re-run duplicate audit against backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Sync Audit</span>
          </button>
        </div>
      </div>

      {/* Duplicate Clusters List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Hash Collision Clusters ({filteredGroups.length})
          </h3>
          <span className="text-xs text-slate-500">
            Earliest ingest record designated as canonical primary copy
          </span>
        </div>

        {isLoading ? (
          <div className="nexus-card p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              Running Cryptographic Deduplication Audit...
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Scanning SHA-256 digest registries across all storage tiers to identify hash collision clusters.
            </p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="nexus-card p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              {duplicateGroups.length === 0 ? 'Zero Duplicate Files Detected' : 'No Clusters Match Search Query'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {duplicateGroups.length === 0
                ? `No duplicate hash collisions found across ${totalFilesAnalyzed} analyzed file objects. All stored objects possess unique SHA-256 cryptographic digests.`
                : 'Try adjusting your search terms.'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group, idx) => (
            <div key={group.hash} className="nexus-card overflow-hidden border-slate-200">
              {/* Cluster Header */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Cluster #{idx + 1}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                      {group.duplicates.length} redundant {group.duplicates.length === 1 ? 'copy' : 'copies'}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      Wasted: {formatBytes(group.total_wasted_bytes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-md">{group.hash}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setInspectingGroup(group)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Compare Diff</span>
                  </button>

                  <button
                    onClick={() => handleDeduplicateCluster(group.hash)}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Deduplicate Cluster</span>
                  </button>
                </div>
              </div>

              {/* Cluster Body: Primary vs Duplicates */}
              <div className="p-4 space-y-3">
                {/* Canonical Primary File */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{group.original_file.filename}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PRIMARY CANONICAL
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span>Size: <strong className="font-mono text-slate-700">{formatBytes(group.original_file.file_size)}</strong></span>
                        <span>·</span>
                        <span>Ingested: <span className="font-mono">{formatDate(group.original_file.created_at)}</span></span>
                        <span>·</span>
                        <TierBadge tier={group.original_file.storage_tier} size="sm" />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                    Kept Safe
                  </span>
                </div>

                {/* Redundant Replicas */}
                <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Redundant Copies to Purge ({group.duplicates.length})
                  </p>
                  {group.duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between hover:bg-amber-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                          <Copy className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800">{dup.filename}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {dup.id}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span>Wasted: <strong className="font-mono text-amber-700">{formatBytes(dup.file_size)}</strong></span>
                            <span>·</span>
                            <span>Last accessed: <span className="font-mono">{dup.inactivity_days}d ago</span></span>
                            <span>·</span>
                            <TierBadge tier={dup.storage_tier} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Deletes ONLY this individual duplicate copy */}
                      <button
                        onClick={() => handleDeleteSingleDuplicate(dup.id, group.hash)}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete this individual duplicate copy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Side-by-Side Comparison Diff Modal */}
      {inspectingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Side-by-Side Duplicate Collision Diff</h3>
                  <p className="text-xs text-slate-500 font-mono truncate max-w-md">SHA-256: {inspectingGroup.hash}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingGroup(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Comparison */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Primary Canonical */}
                <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      CANONICAL ORIGINAL
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">Protected</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{inspectingGroup.original_file.filename}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {inspectingGroup.original_file.id}</p>
                  </div>
                  <div className="text-xs space-y-1.5 pt-2 border-t border-emerald-200/60 text-slate-600">
                    <div className="flex justify-between">
                      <span>Byte Size:</span>
                      <strong className="font-mono text-slate-900">{formatBytes(inspectingGroup.original_file.file_size)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Tier:</span>
                      <TierBadge tier={inspectingGroup.original_file.storage_tier} size="sm" />
                    </div>
                    <div className="flex justify-between">
                      <span>Ingest Timestamp:</span>
                      <span className="font-mono">{formatDate(inspectingGroup.original_file.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <CategoryBadge category={inspectingGroup.original_file.category} />
                    </div>
                  </div>
                </div>

                {/* Right: Duplicate Replicas List */}
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                      REDUNDANT REPLICA(S)
                    </span>
                    <span className="text-xs font-semibold text-amber-700">Wasting {formatBytes(inspectingGroup.total_wasted_bytes)}</span>
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {inspectingGroup.duplicates.map((dup) => (
                      <div key={dup.id} className="p-2.5 bg-white rounded-lg border border-amber-200 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 truncate max-w-[180px]">{dup.filename}</span>
                          <button
                            onClick={() => {
                              handleDeleteSingleDuplicate(dup.id, inspectingGroup.hash);
                              setInspectingGroup(null);
                            }}
                            disabled={isDeleting}
                            className="text-rose-600 hover:text-rose-700 font-semibold text-[11px] flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Copy
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between">
                          <span>Size: <strong className="font-mono">{formatBytes(dup.file_size)}</strong></span>
                          <span>Tier: {dup.storage_tier}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Exact Bit-Level Checksum Match:</strong> The SHA-256 hashes of the original and duplicate match character-for-character across all 64 hexadecimal nibbles. Purging replicas will strictly preserve canonical master data.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setInspectingGroup(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Close Comparison
              </button>

              <button
                onClick={() => {
                  handleDeduplicateCluster(inspectingGroup.hash);
                  setInspectingGroup(null);
                }}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Deduplicate Entire Cluster</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{confirmDialog.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Canonical master objects are permanently protected from deletion.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50/80 border-t border-slate-100">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
