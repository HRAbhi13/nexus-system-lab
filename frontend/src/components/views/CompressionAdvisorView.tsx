import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Minimize2, 
  Sparkles, 
  ArrowRight, 
  Search, 
  Sliders, 
  Info, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { StorageTier, StorageFile, FileCategory, CompressionCandidate } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { TierBadge } from '../common/TierBadge';
import { nexusApi, BackendCompressionAuditReport, BackendFileMetadata } from '../../services/api';

interface CompressionAdvisorViewProps {
  candidates?: CompressionCandidate[];
  onCompressCandidate?: (fileId: string) => void;
  onCompressAll?: () => void;
}

type CompressionEffort = 'fast' | 'balanced' | 'maximum';

interface IneligibleFileRecord {
  id: string;
  filename: string;
  file_size: number;
  reason: string;
  detected_format: string;
}

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

export const CompressionAdvisorView: React.FC<CompressionAdvisorViewProps> = ({
  onCompressCandidate,
  onCompressAll,
}) => {
  // Live Backend Data States
  const [report, setReport] = useState<BackendCompressionAuditReport | null>(null);
  const [fileMetadataMap, setFileMetadataMap] = useState<Map<number, BackendFileMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User Filter & Simulation Controls
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'all' | 'zstd' | 'gzip'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [compressionEffort, setCompressionEffort] = useState<CompressionEffort>('balanced');
  const [showIneligible, setShowIneligible] = useState(false);

  // Fetch real audit data from FastAPI backend
  const fetchCompressionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [compReport, fileListRes] = await Promise.all([
        nexusApi.auditCompression(),
        nexusApi.listFiles(),
      ]);
      setReport(compReport);

      const map = new Map<number, BackendFileMetadata>();
      (fileListRes.files || []).forEach((f) => {
        map.set(f.id, f);
      });
      setFileMetadataMap(map);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve compression advisory from FastAPI backend.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompressionData();
  }, [fetchCompressionData]);

  // Effort multiplier adjusts estimated ratio dynamically
  // Fast: slightly larger size (lower savings)
  // Balanced: default ratio
  // Maximum: smaller size (higher savings)
  const effortMultipliers: Record<CompressionEffort, { factor: number; label: string; desc: string }> = {
    fast: { factor: 1.15, label: 'Fast (Low CPU)', desc: 'Lowest CPU overhead, standard Gzip/Zstd level 3' },
    balanced: { factor: 1.0, label: 'Balanced (Standard)', desc: 'Optimal trade-off between CPU cycles and byte savings' },
    maximum: { factor: 0.85, label: 'Maximum (High Ratio)', desc: 'Deep level 9 algorithmic compression' },
  };

  const currentEffort = effortMultipliers[compressionEffort];

  // Map backend recommendations where is_compression_recommended is true to CompressionCandidate[]
  const rawCandidates: CompressionCandidate[] = useMemo(() => {
    if (!report || !report.recommendations) return [];

    const validCategories: FileCategory[] = [
      'Document', 'Image', 'Video', 'Audio', 'Archive', 'Code', 'Data', 'Other'
    ];
    const validTiers: StorageTier[] = ['HOT', 'WARM', 'COLD', 'ARCHIVE'];

    return report.recommendations
      .filter((r) => r.is_compression_recommended)
      .map((r) => {
        const meta = fileMetadataMap.get(r.file_id);
        const matchedCategory = validCategories.find(
          (c) => c.toLowerCase() === (r.category || meta?.category || '').toLowerCase()
        ) || 'Other';

        const upperTier = (meta?.storage_tier || 'HOT').toUpperCase();
        const matchedTier: StorageTier = validTiers.includes(upperTier as StorageTier)
          ? (upperTier as StorageTier)
          : 'HOT';

        const fileObj: StorageFile = {
          id: String(r.file_id),
          filename: r.filename,
          file_size: r.original_size_bytes,
          mime_type: meta?.mime_type || 'application/octet-stream',
          category: matchedCategory,
          storage_tier: matchedTier,
          sha256_hash: meta?.sha256_hash || '',
          is_duplicate: Boolean(meta?.is_duplicate),
          original_file_id: meta?.original_file_id ? String(meta.original_file_id) : null,
          created_at: meta?.upload_timestamp || new Date().toISOString(),
          last_accessed_at: meta?.last_accessed_timestamp || new Date().toISOString(),
          inactivity_days: 0,
        };

        const algoRaw = (r.compression_algorithm || 'gzip').toLowerCase();
        const algoFormatted = algoRaw === 'zstd' ? 'Zstandard' : 'Gzip';
        const estimatedRatio = r.original_size_bytes > 0
          ? r.estimated_compressed_bytes / r.original_size_bytes
          : 0.75;

        return {
          file: fileObj,
          compressible: true,
          estimated_ratio: estimatedRatio,
          estimated_compressed_bytes: r.estimated_compressed_bytes,
          estimated_saved_bytes: r.estimated_savings_bytes,
          recommended_algorithm: algoFormatted as 'Zstandard' | 'Gzip',
        };
      });
  }, [report, fileMetadataMap]);

  // Map backend recommendations where is_compression_recommended is false to ineligible objects
  const ineligibleFiles: IneligibleFileRecord[] = useMemo(() => {
    if (!report || !report.recommendations) return [];

    return report.recommendations
      .filter((r) => !r.is_compression_recommended)
      .map((r) => {
        const ext = r.filename.split('.').pop()?.toLowerCase() || '';
        let reason = 'High entropy format yields <15% space reduction; excluded to conserve CPU.';
        let detected_format = ext ? `${ext.toUpperCase()} File` : 'Binary Stream';

        if (r.original_size_bytes < 1024) {
          reason = 'Micro-object (< 1 KB). Compression framing overhead exceeds potential space reduction.';
          detected_format = 'Micro-file (< 1 KB)';
        } else if (['zip', 'gz', 'tar', '7z'].includes(ext)) {
          reason = 'Pre-compressed archive container. Re-compressing incurs high CPU overhead with negligible gain.';
          detected_format = `${ext.toUpperCase()} Archive`;
        } else if (['mp4', 'mkv', 'mov', 'avi'].includes(ext)) {
          reason = 'Pre-compressed video stream. High entropy container yields negligible byte reduction.';
          detected_format = `${ext.toUpperCase()} Video`;
        } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          reason = 'Rasterized compressed image stream. Standard lossless compression yields negligible reduction.';
          detected_format = `${ext.toUpperCase()} Image`;
        } else if (['mp3', 'flac', 'wav'].includes(ext)) {
          reason = 'Compressed audio stream. Re-compression yields negligible byte reduction.';
          detected_format = `${ext.toUpperCase()} Audio`;
        }

        return {
          id: String(r.file_id),
          filename: r.filename,
          file_size: r.original_size_bytes,
          reason,
          detected_format,
        };
      });
  }, [report]);

  // Filter candidates by algorithm & search
  const filteredCandidates = useMemo(() => {
    return rawCandidates.filter((c) => {
      const algoCode = c.recommended_algorithm === 'Zstandard' ? 'zstd' : 'gzip';
      const matchAlgo = selectedAlgorithm === 'all' || algoCode === selectedAlgorithm;
      const matchSearch = c.file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.file.mime_type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchAlgo && matchSearch;
    });
  }, [rawCandidates, selectedAlgorithm, searchTerm]);

  // Recalculated dynamic metrics based on simulated effort level
  const dynamicCandidates = useMemo(() => {
    return filteredCandidates.map((c) => {
      const dynamicRatio = Math.min(0.85, Math.max(0.15, c.estimated_ratio * currentEffort.factor));
      const compressedBytes = Math.round(c.file.file_size * dynamicRatio);
      const savedBytes = c.file.file_size - compressedBytes;

      return {
        ...c,
        dynamicRatio,
        compressedBytes,
        savedBytes,
      };
    });
  }, [filteredCandidates, currentEffort]);

  // Overall calculations for stats bar
  const totalOriginalBytes = dynamicCandidates.reduce((acc, c) => acc + c.file.file_size, 0);
  const totalCompressedBytes = dynamicCandidates.reduce((acc, c) => acc + c.compressedBytes, 0);
  const totalSavedBytes = dynamicCandidates.reduce((acc, c) => acc + c.savedBytes, 0);
  const averageRatio = totalOriginalBytes > 0 ? (totalSavedBytes / totalOriginalBytes) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-navy-900 rounded-2xl p-6 text-white border border-emerald-500/30 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Algorithmic Entropy Advisory</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Storage Compression Advisor
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Analyzes file entropy and format characteristics to estimate recoverable storage space. Pre-compressed multimedia (MP4, PNG, ZIP) and micro-files under 1 KB are automatically filtered out to preserve processing CPU cycles. All figures represent projected estimates.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={fetchCompressionData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-medium border border-white/15 transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync Live Advisory</span>
              </button>
              <button
                onClick={onCompressAll}
                disabled={dynamicCandidates.length === 0 || isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/25"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Simulate Batch Compression</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              Estimated Total Savings: <span className="text-emerald-400 font-mono font-bold">~{formatBytes(totalSavedBytes)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-3 text-red-800 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-900">Compression Advisory Error</h4>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchCompressionData}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 shadow-sm transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="nexus-card p-12 text-center space-y-4">
          <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Auditing Storage Compressibility</h4>
            <p className="text-xs text-slate-500">
              Evaluating entropy, parsing format signatures, and projecting recoverable storage from FastAPI backend...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Compressible Candidates</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">{dynamicCandidates.length}</span>
                <span className="text-xs text-slate-500">
                  of {report?.total_files_analyzed ?? 0} files
                </span>
              </div>
            </div>

            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Original Uncompressed</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-slate-800">{formatBytes(totalOriginalBytes)}</span>
              </div>
            </div>

            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Projected Post-Compression</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-600">{formatBytes(totalCompressedBytes)}</span>
              </div>
            </div>

            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Estimated Byte Reduction</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-600">~{averageRatio.toFixed(1)}%</span>
                <span className="text-xs text-slate-500">{currentEffort.label}</span>
              </div>
            </div>
          </div>

          {/* Control Strip: Search & Compression Effort Level */}
          <div className="nexus-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter compressible candidates by name or MIME type..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Algorithm Filter */}
              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <span className="text-slate-400 font-medium">Algorithm:</span>
                {(['all', 'zstd', 'gzip'] as const).map((algo) => (
                  <button
                    key={algo}
                    onClick={() => setSelectedAlgorithm(algo)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedAlgorithm === algo
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {algo === 'all' ? 'All' : algo === 'zstd' ? 'Zstandard (zstd)' : 'Gzip'}
                  </button>
                ))}
              </div>
            </div>

            {/* Compression Effort Level Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Simulate Compression Effort:</span>
                <span className="text-slate-500">{currentEffort.desc}</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">
                {(['fast', 'balanced', 'maximum'] as CompressionEffort[]).map((effort) => (
                  <button
                    key={effort}
                    onClick={() => setCompressionEffort(effort)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all capitalize ${
                      compressionEffort === effort
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {effort}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div className="nexus-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">High-Gain Compression Candidates ({dynamicCandidates.length})</h3>
                <p className="text-xs text-slate-500">Ranked by estimated recoverable storage volume from FastAPI analysis</p>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Estimated Net Savings: ~{formatBytes(totalSavedBytes)}
              </span>
            </div>

            {/* Candidates Table */}
            <div className="space-y-3">
              {dynamicCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {rawCandidates.length === 0 
                    ? 'Zero Compressible Candidates Identified. All files are either pre-compressed or optimal.' 
                    : 'No candidates found matching the selected filter.'}
                </div>
              ) : (
                dynamicCandidates.map((candidate) => {
                  const savingsPercent = ((1 - candidate.dynamicRatio) * 100).toFixed(0);

                  return (
                    <div
                      key={candidate.file.id}
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{candidate.file.filename}</span>
                          <CategoryBadge category={candidate.file.category} />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>MIME: {candidate.file.mime_type}</span>
                          <span>·</span>
                          <TierBadge tier={candidate.file.storage_tier} size="sm" />
                        </div>
                      </div>

                      {/* Size Comparison & Visual Bar */}
                      <div className="flex-1 max-w-xs space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-500">{formatBytes(candidate.file.file_size)}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 self-center" />
                          <span className="text-emerald-700 font-bold">{formatBytes(candidate.compressedBytes)}</span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(1 - candidate.dynamicRatio) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Estimated Recoverable: <strong>{formatBytes(candidate.savedBytes)}</strong></span>
                          <span className="text-emerald-600 font-bold">~{savingsPercent}% reduction</span>
                        </div>
                      </div>

                      {/* Recommended Algorithm & Action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-semibold">
                          {candidate.recommended_algorithm}
                        </span>

                        <button
                          onClick={() => onCompressCandidate && onCompressCandidate(candidate.file.id)}
                          className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          Simulate
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ineligible / Pre-Compressed Files Drawer (Audit Feature) */}
          <div className="nexus-card overflow-hidden">
            <button
              onClick={() => setShowIneligible(!showIneligible)}
              className="w-full p-4 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Ineligible & Pre-Compressed Files Audit ({ineligibleFiles.length} objects skipped)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Files analyzed and excluded by entropy threshold heuristics to avoid CPU waste
                  </p>
                </div>
              </div>
              {showIneligible ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showIneligible && (
              <div className="p-4 border-t border-slate-200/80 bg-white space-y-2 animate-in fade-in duration-150">
                {ineligibleFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Zero objects excluded. All current storage files were found eligible for compression.
                  </p>
                ) : (
                  ineligibleFiles.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.filename}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">
                            {item.detected_format}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">{item.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-slate-600">{formatBytes(item.file_size)}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-200 px-2 py-0.5 rounded">
                          Skipped
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
