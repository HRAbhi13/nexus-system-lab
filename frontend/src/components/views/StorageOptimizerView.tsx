import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Flame, 
  Sun, 
  Snowflake, 
  Archive, 
  Sliders,
  RefreshCw,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { TierRecommendation, StorageTier, StorageFile, FileCategory } from '../../types';
import { TierBadge } from '../common/TierBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { nexusApi, BackendTierLifecycleReport, BackendFileMetadata } from '../../services/api';

interface StorageOptimizerViewProps {
  recommendations?: TierRecommendation[];
  onApplyRecommendation?: (fileId: string, newTier: StorageTier) => void;
  onApplyAllRecommendations?: () => void;
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

/**
 * Format currency amounts in USD
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: amount > 0 && amount < 0.01 ? 4 : 2,
  }).format(amount);
};

export const StorageOptimizerView: React.FC<StorageOptimizerViewProps> = ({
  onApplyRecommendation,
  onApplyAllRecommendations,
}) => {
  // Live Backend Data States
  const [report, setReport] = useState<BackendTierLifecycleReport | null>(null);
  const [fileMetadataMap, setFileMetadataMap] = useState<Map<number, BackendFileMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // In-flight Action States
  const [migratingId, setMigratingId] = useState<string | null>(null);
  const [isBatchMigrating, setIsBatchMigrating] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    title: string;
    detail?: string;
  } | null>(null);

  // Destination Tier Filter State
  const [targetTierFilter, setTargetTierFilter] = useState<'ALL' | 'WARM' | 'COLD' | 'ARCHIVE'>('ALL');

  // Interactive Inactivity Threshold Slider State (default 30 days)
  const [thresholdDays, setThresholdDays] = useState<number>(30);

  // Fetch real lifecycle audit data from FastAPI backend
  const fetchLifecycleData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lifecycleReport, fileListRes] = await Promise.all([
        nexusApi.auditLifecycle(),
        nexusApi.listFiles(),
      ]);
      setReport(lifecycleReport);

      const map = new Map<number, BackendFileMetadata>();
      (fileListRes.files || []).forEach((f) => {
        map.set(f.id, f);
      });
      setFileMetadataMap(map);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve storage lifecycle recommendations from FastAPI backend.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLifecycleData();
  }, [fetchLifecycleData]);

  // Map backend recommendations to typed TierRecommendation[]
  const rawRecommendations: TierRecommendation[] = useMemo(() => {
    if (!report || !report.recommendations) return [];

    const validCategories: FileCategory[] = [
      'Document', 'Image', 'Video', 'Audio', 'Archive', 'Code', 'Data', 'Other'
    ];
    const validTiers: StorageTier[] = ['HOT', 'WARM', 'COLD', 'ARCHIVE'];

    return report.recommendations.map((adv) => {
      const meta = fileMetadataMap.get(adv.file_id);
      const matchedCategory = validCategories.find(
        (c) => c.toLowerCase() === (adv.category || meta?.category || '').toLowerCase()
      ) || 'Other';

      const currentUpper = (adv.current_tier || meta?.storage_tier || 'HOT').toUpperCase();
      const currentTier: StorageTier = validTiers.includes(currentUpper as StorageTier)
        ? (currentUpper as StorageTier)
        : 'HOT';

      const recUpper = (adv.recommended_tier || 'WARM').toUpperCase();
      const recommendedTier: StorageTier = validTiers.includes(recUpper as StorageTier)
        ? (recUpper as StorageTier)
        : 'WARM';

      const fileObj: StorageFile = {
        id: String(adv.file_id),
        filename: adv.filename,
        file_size: adv.file_size_bytes,
        mime_type: meta?.mime_type || 'application/octet-stream',
        category: matchedCategory,
        storage_tier: currentTier,
        sha256_hash: meta?.sha256_hash || '',
        is_duplicate: Boolean(meta?.is_duplicate),
        original_file_id: meta?.original_file_id ? String(meta.original_file_id) : null,
        created_at: meta?.upload_timestamp || new Date().toISOString(),
        last_accessed_at: meta?.last_accessed_timestamp || new Date().toISOString(),
        inactivity_days: adv.days_since_last_access,
      };

      return {
        file: fileObj,
        current_tier: currentTier,
        recommended_tier: recommendedTier,
        inactivity_days: adv.days_since_last_access,
        current_monthly_cost: adv.current_monthly_cost,
        recommended_monthly_cost: adv.recommended_monthly_cost,
        projected_monthly_savings: adv.projected_monthly_savings,
        reason: adv.reason,
      };
    });
  }, [report, fileMetadataMap]);

  // Filter recommendations based on destination tier and threshold slider
  const filteredRecommendations = useMemo(() => {
    return rawRecommendations.filter((r) => {
      const matchTier = targetTierFilter === 'ALL' || r.recommended_tier === targetTierFilter;
      const matchThreshold = r.inactivity_days >= thresholdDays;
      return matchTier && matchThreshold;
    });
  }, [rawRecommendations, targetTierFilter, thresholdDays]);

  const totalMonthlySavings = useMemo(() => {
    return filteredRecommendations.reduce((acc, r) => acc + r.projected_monthly_savings, 0);
  }, [filteredRecommendations]);

  const oneYearSavings = totalMonthlySavings * 12;
  const threeYearSavings = totalMonthlySavings * 36;

  // Single file migration handler
  const handleSingleMigrate = async (fileId: string, targetTier: StorageTier) => {
    setMigratingId(fileId);
    setActionMessage(null);

    try {
      const updated = await nexusApi.updateFileTier(Number(fileId), targetTier);
      if (!updated || updated.storage_tier !== targetTier) {
        throw new Error(`Backend did not confirm tier transition to ${targetTier}.`);
      }

      if (onApplyRecommendation) {
        onApplyRecommendation(fileId, targetTier);
      }

      setActionMessage({
        type: 'success',
        title: 'Tier Transition Confirmed',
        detail: `Successfully migrated "${updated.filename}" to ${updated.storage_tier} storage tier in backend database.`,
      });

      await fetchLifecycleData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Migration request failed. File remains in current tier.';
      setActionMessage({
        type: 'error',
        title: 'Migration Failed',
        detail: message,
      });
    } finally {
      setMigratingId(null);
    }
  };

  // Batch migration handler using Promise.allSettled
  const handleBatchMigrate = async () => {
    if (filteredRecommendations.length === 0 || isBatchMigrating) return;

    setIsBatchMigrating(true);
    setActionMessage(null);

    const targets = [...filteredRecommendations];
    const promises = targets.map((rec) =>
      nexusApi.updateFileTier(Number(rec.file.id), rec.recommended_tier)
        .then((res) => ({ fileId: rec.file.id, filename: rec.file.filename, targetTier: rec.recommended_tier, res }))
    );

    const results = await Promise.allSettled(promises);

    const succeeded: string[] = [];
    const failed: { filename: string; reason: string }[] = [];

    results.forEach((res, index) => {
      const item = targets[index];
      if (res.status === 'fulfilled') {
        succeeded.push(item.file.filename);
        if (onApplyRecommendation) {
          onApplyRecommendation(item.file.id, item.recommended_tier);
        }
      } else {
        const reason = res.reason instanceof Error ? res.reason.message : 'Request failed';
        failed.push({ filename: item.file.filename, reason });
      }
    });

    if (succeeded.length > 0 && onApplyAllRecommendations && failed.length === 0) {
      onApplyAllRecommendations();
    }

    await fetchLifecycleData();

    if (failed.length === 0) {
      setActionMessage({
        type: 'success',
        title: 'Batch Migration Complete',
        detail: `Successfully migrated all ${succeeded.length} files to their optimal storage tiers in backend database.`,
      });
    } else if (succeeded.length > 0) {
      setActionMessage({
        type: 'error',
        title: 'Partial Batch Migration',
        detail: `Migrated ${succeeded.length} files successfully. ${failed.length} operations failed: ${failed.map(f => `${f.filename} (${f.reason})`).join(', ')}.`,
      });
    } else {
      setActionMessage({
        type: 'error',
        title: 'Batch Migration Failed',
        detail: `All ${failed.length} migration operations failed. Check backend connectivity.`,
      });
    }

    setIsBatchMigrating(false);
  };

  const tierSpecs = [
    {
      tier: 'HOT' as StorageTier,
      name: 'Standard Active',
      cost: '$0.0230',
      minDays: '0 Days',
      target: 'Daily / Weekly Access',
      icon: Flame,
      color: 'border-rose-200 bg-rose-50/50 text-rose-800',
      iconColor: 'text-rose-500',
    },
    {
      tier: 'WARM' as StorageTier,
      name: 'Infrequent Access',
      cost: '$0.0125',
      minDays: '30 Days',
      target: 'Monthly / Quarterly Access',
      icon: Sun,
      color: 'border-amber-200 bg-amber-50/50 text-amber-800',
      iconColor: 'text-amber-500',
    },
    {
      tier: 'COLD' as StorageTier,
      name: 'Coldline / Glacier Instant',
      cost: '$0.0040',
      minDays: '90 Days',
      target: 'Rare Access / Compliance',
      icon: Snowflake,
      color: 'border-sky-200 bg-sky-50/50 text-sky-800',
      iconColor: 'text-sky-500',
    },
    {
      tier: 'ARCHIVE' as StorageTier,
      name: 'Glacier Deep Archive',
      cost: '$0.00099',
      minDays: '180 Days',
      target: 'Long-term Cold Storage',
      icon: Archive,
      color: 'border-purple-200 bg-purple-50/50 text-purple-800',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-navy-900 rounded-2xl p-6 text-white border border-blue-500/30 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Lifecycle Tiering</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Cloud Storage Lifecycle Optimizer
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dynamically maps dormant file objects across cloud storage price tiers based on elapsed days since last access. Demoting unaccessed files from HOT to WARM, COLD, or ARCHIVE reduces recurring storage invoices by up to 95%.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLifecycleData}
                disabled={isLoading || isBatchMigrating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-medium border border-white/15 transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync Live Advisory</span>
              </button>
              <button
                onClick={handleBatchMigrate}
                disabled={filteredRecommendations.length === 0 || isLoading || isBatchMigrating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/25"
              >
                {isBatchMigrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Migrating Tiers...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Apply All ({filteredRecommendations.length}) Tier Migrations</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              Projected Monthly Savings: <span className="text-emerald-400 font-mono font-bold">+{formatCurrency(totalMonthlySavings)}/mo</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          <div className="flex items-start gap-3">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-xs font-bold">{actionMessage.title}</h4>
              {actionMessage.detail && <p className="text-xs mt-0.5 opacity-90">{actionMessage.detail}</p>}
            </div>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert with Retry */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-3 text-red-800 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-900">Lifecycle Advisory Error</h4>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchLifecycleData}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 shadow-sm transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Cloud Tier Reference Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tierSpecs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div key={spec.tier} className={`nexus-card p-4 border ${spec.color}`}>
              <div className="flex items-center justify-between">
                <TierBadge tier={spec.tier} size="md" />
                <Icon className={`w-5 h-5 ${spec.iconColor}`} />
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs font-bold text-slate-900">{spec.name}</p>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-lg font-extrabold text-slate-900">{spec.cost}</span>
                  <span className="text-[10px] text-slate-500">/GB/mo</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Threshold:</span>
                  <span className="font-semibold text-slate-800">{spec.minDays}</span>
                </div>
                <div className="flex justify-between">
                  <span>Access:</span>
                  <span className="truncate max-w-[110px] text-slate-800">{spec.target}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="nexus-card p-12 text-center space-y-4">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Auditing Storage Lifecycle Profiles</h4>
            <p className="text-xs text-slate-500">
              Evaluating access frequencies and computing cost-saving tier recommendations from FastAPI backend...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Interactive Controls & Destination Filter Strip */}
          <div className="nexus-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Destination Tier Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
                  Destination Tier:
                </span>
                {(['ALL', 'WARM', 'COLD', 'ARCHIVE'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTargetTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      targetTierFilter === tier
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tier === 'ALL' ? 'All Destination Tiers' : `To ${tier}`}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredRecommendations.length}</strong> matching policies
              </span>
            </div>

            {/* Inactivity Threshold Slider */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800">Interactive Inactivity Threshold Filter:</span>
                  <span className="text-slate-500">Only recommend files unaccessed for at least:</span>
                </div>
                <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  &ge; {thresholdDays} Days Dormant
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[11px] font-mono text-slate-400">15d</span>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="5"
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[11px] font-mono text-slate-400">180d</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Aggressive (15d)</span>
                <span>Standard (30d)</span>
                <span>Conservative (90d)</span>
                <span>High Latency (180d)</span>
              </div>
            </div>

            {/* Projected ROI Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <p className="text-[11px] font-semibold uppercase text-emerald-800">Monthly Projected Savings</p>
                <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">+{formatCurrency(totalMonthlySavings)}</p>
                <p className="text-[10px] text-emerald-600 mt-1">Direct invoice reduction</p>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <p className="text-[11px] font-semibold uppercase text-blue-800">1-Year Projected Savings</p>
                <p className="text-xl font-bold font-mono text-blue-700 mt-0.5">+{formatCurrency(oneYearSavings)}</p>
                <p className="text-[10px] text-blue-600 mt-1">Projected annual reduction</p>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
                <p className="text-[11px] font-semibold uppercase text-purple-800">3-Year Projected Savings</p>
                <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">+{formatCurrency(threeYearSavings)}</p>
                <p className="text-[10px] text-purple-600 mt-1">Estimated 36-month savings</p>
              </div>
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="nexus-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Active Tier Migration Recommendations ({filteredRecommendations.length})
                </h3>
                <p className="text-xs text-slate-500">Heuristic policies calculated from real object inactivity logs</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                Net Monthly Saving: +{formatCurrency(totalMonthlySavings)}/mo
              </span>
            </div>

            {filteredRecommendations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">All Objects in Optimal Tiers</h4>
                <p className="text-xs text-slate-500">
                  {report && report.total_files_analyzed === 0
                    ? 'No files stored in NEXUS bucket yet. Ingest files to analyze lifecycle policies.'
                    : `No dormant files currently exceed the ${thresholdDays}-day inactivity threshold for ${targetTierFilter === 'ALL' ? 'any tier' : targetTierFilter}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecommendations.map((rec) => (
                  <div
                    key={rec.file.id}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* File info & reason */}
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{rec.file.filename}</span>
                        <CategoryBadge category={rec.file.category} />
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{rec.reason}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>Size: <strong className="text-slate-700">{formatBytes(rec.file.file_size)}</strong></span>
                        <span>·</span>
                        <span className="text-amber-600 font-semibold">{rec.inactivity_days} days inactive</span>
                      </div>
                    </div>

                    {/* Tier Transition Arrow */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <TierBadge tier={rec.current_tier} size="md" />
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                      <TierBadge tier={rec.recommended_tier} size="md" />
                    </div>

                    {/* Financial Impact */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-xs font-mono text-slate-500 line-through">
                        {formatCurrency(rec.current_monthly_cost)}/mo
                      </p>
                      <p className="text-sm font-bold font-mono text-slate-900">
                        {formatCurrency(rec.recommended_monthly_cost)}/mo
                      </p>
                      <p className="text-xs font-bold font-mono text-emerald-600">
                        Save +{formatCurrency(rec.projected_monthly_savings)}/mo
                      </p>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => handleSingleMigrate(rec.file.id, rec.recommended_tier)}
                      disabled={migratingId === rec.file.id || isBatchMigrating}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shadow-blue-600/20 shrink-0"
                    >
                      {migratingId === rec.file.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Migrating...</span>
                        </>
                      ) : (
                        <span>Migrate to {rec.recommended_tier}</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
