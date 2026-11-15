import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Download, 
  CheckCircle2,
  TrendingDown,
  Layers,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { 
  nexusApi, 
  BackendStorageDashboard, 
  BackendOptimizationRoi, 
  BackendTierResponse 
} from '../../services/api';
import { TierBadge } from '../common/TierBadge';
import { StorageTier, TimeRange } from '../../types';

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
 * Format currency amounts in USD with adaptive precision for sub-cent values.
 * Prevents non-zero amounts from misleadingly displaying as $0.00.
 */
const formatCurrency = (amount: number, maxDecimals?: number): string => {
  if (amount === 0) return '$0.00';
  const abs = Math.abs(amount);
  let decimals = 2;
  if (maxDecimals !== undefined) {
    decimals = maxDecimals;
  } else if (abs > 0 && abs < 0.0001) {
    decimals = 6;
  } else if (abs > 0 && abs < 0.01) {
    decimals = 4;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  }).format(amount);

  if (formatted === '$0.00' && abs > 0) {
    return '< $0.0001';
  }
  return formatted;
};

/**
 * Format currency for chart axis ticks
 */
const formatAxisCurrency = (val: number): string => {
  if (val === 0) return '$0';
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  if (val >= 1) return `$${val.toFixed(val % 1 === 0 ? 0 : 2)}`;
  if (val >= 0.01) return `$${val.toFixed(2)}`;
  if (val >= 0.0001) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(6)}`;
};

const categoryColors: Record<string, string> = {
  Data: '#3b82f6',
  Archive: '#8b5cf6',
  Video: '#ec4899',
  Document: '#10b981',
  Code: '#f59e0b',
  Image: '#06b6d4',
  Audio: '#a855f7',
  Other: '#64748b',
};

const tierColors: Record<string, string> = {
  HOT: '#ef4444',
  WARM: '#f59e0b',
  COLD: '#0284c7',
  ARCHIVE: '#7c3aed',
};

const bracketColors = ['#94a3b8', '#38bdf8', '#3b82f6', '#6366f1', '#8b5cf6'];

export const AnalyticsView: React.FC = () => {
  // Live Backend Data States
  const [dashboard, setDashboard] = useState<BackendStorageDashboard | null>(null);
  const [roi, setRoi] = useState<BackendOptimizationRoi | null>(null);
  const [tiers, setTiers] = useState<BackendTierResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI Interactive States
  const [downloadNotice, setDownloadNotice] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  // Fetch real analytics data from FastAPI backend
  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashData, roiData, tiersData] = await Promise.all([
        nexusApi.getStorageDashboard(),
        nexusApi.getOptimizationRoi(),
        nexusApi.getTiers(),
      ]);
      setDashboard(dashData);
      setRoi(roiData);
      setTiers(tiersData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve storage analytics from FastAPI backend.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Derived Optimization Health Score (clearly identified as a derived indicator)
  const derivedHealthScore = useMemo(() => {
    if (!dashboard || dashboard.overview.total_files === 0) return 100;
    const dupPenalty = (dashboard.overview.duplicate_volume_percentage || 0) * 0.5;
    const savingsPenalty = (roi?.overall_projected_savings_percentage || 0) * 0.5;
    return Math.max(10, Math.min(100, Math.round(100 - dupPenalty - savingsPenalty)));
  }, [dashboard, roi]);

  // Category Bar Chart Data with dynamic unit (KB, MB, GB) based on estate volume
  const { categoryBarData, categoryUnit } = useMemo(() => {
    const categories = dashboard?.category_distribution || [];
    const maxBytes = Math.max(0, ...categories.map((c) => c.total_bytes));

    let unit: 'KB' | 'MB' | 'GB' = 'GB';
    let divisor = 1024 * 1024 * 1024;
    let decimals = 2;

    if (maxBytes < 1024 * 1024) {
      unit = 'KB';
      divisor = 1024;
      decimals = 1;
    } else if (maxBytes < 1024 * 1024 * 1024) {
      unit = 'MB';
      divisor = 1024 * 1024;
      decimals = 1;
    }

    const data = categories.map((c) => ({
      name: c.category,
      volume: parseFloat((c.total_bytes / divisor).toFixed(decimals)),
      rawBytes: c.total_bytes,
      files: c.file_count,
      color: categoryColors[c.category] || '#64748b',
    }));

    return { categoryBarData: data, categoryUnit: unit };
  }, [dashboard]);

  // Tier Pie Chart Data
  const tierPieData = useMemo(() => {
    return (dashboard?.tier_distribution || []).map((t) => ({
      name: t.storage_tier,
      total_bytes: t.total_bytes,
      file_count: t.file_count,
      color: tierColors[t.storage_tier] || '#64748b',
    }));
  }, [dashboard]);

  // Size Distribution Brackets
  const sizeBracketData = useMemo(() => {
    const brackets = dashboard?.size_brackets || [];
    const maxCount = Math.max(1, ...brackets.map((b) => b.file_count));
    return brackets.map((b, idx) => ({
      bracket: b.bracket_label,
      count: b.file_count,
      formattedVolume: formatBytes(b.total_bytes),
      barPercent: (b.file_count / maxCount) * 100,
      color: bracketColors[idx % bracketColors.length],
    }));
  }, [dashboard]);

  // Projected Spend Trajectory (Explicit forward projection, not historical data)
  const projectedChartData = useMemo(() => {
    const baselineMonthly = roi?.current_monthly_spend || 0;
    const savingsMonthly = roi?.total_projected_monthly_savings || 0;
    const optimizedMonthly = Math.max(0, baselineMonthly - savingsMonthly);

    if (timeRange === '30D') {
      return [
        { month: 'Week 1', baseline: parseFloat(((baselineMonthly / 4) * 1).toFixed(6)), optimized: parseFloat(((optimizedMonthly / 4) * 1).toFixed(6)) },
        { month: 'Week 2', baseline: parseFloat(((baselineMonthly / 4) * 2).toFixed(6)), optimized: parseFloat(((optimizedMonthly / 4) * 2).toFixed(6)) },
        { month: 'Week 3', baseline: parseFloat(((baselineMonthly / 4) * 3).toFixed(6)), optimized: parseFloat(((optimizedMonthly / 4) * 3).toFixed(6)) },
        { month: 'Week 4', baseline: parseFloat(((baselineMonthly / 4) * 4).toFixed(6)), optimized: parseFloat(((optimizedMonthly / 4) * 4).toFixed(6)) },
      ];
    } else if (timeRange === '90D') {
      return [
        { month: 'Month 1', baseline: parseFloat((baselineMonthly * 1).toFixed(6)), optimized: parseFloat((optimizedMonthly * 1).toFixed(6)) },
        { month: 'Month 2', baseline: parseFloat((baselineMonthly * 2).toFixed(6)), optimized: parseFloat((optimizedMonthly * 2).toFixed(6)) },
        { month: 'Month 3', baseline: parseFloat((baselineMonthly * 3).toFixed(6)), optimized: parseFloat((optimizedMonthly * 3).toFixed(6)) },
      ];
    } else if (timeRange === '6M') {
      return Array.from({ length: 6 }, (_, i) => ({
        month: `Month ${i + 1}`,
        baseline: parseFloat((baselineMonthly * (i + 1)).toFixed(6)),
        optimized: parseFloat((optimizedMonthly * (i + 1)).toFixed(6)),
      }));
    } else {
      // 1Y
      return Array.from({ length: 12 }, (_, i) => ({
        month: `M${i + 1}`,
        baseline: parseFloat((baselineMonthly * (i + 1)).toFixed(6)),
        optimized: parseFloat((optimizedMonthly * (i + 1)).toFixed(6)),
      }));
    }
  }, [roi, timeRange]);

  // Tier Matrix Table Calculations combining live distribution and pricing
  const tierMatrixRows = useMemo(() => {
    const validTiers: StorageTier[] = ['HOT', 'WARM', 'COLD', 'ARCHIVE'];
    const totalEstateBytes = dashboard?.overview.total_bytes || 0;

    return validTiers.map((tier) => {
      const tierDist = dashboard?.tier_distribution.find((td) => td.storage_tier === tier);
      const tierMeta = tiers.find((t) => t.id === tier);

      const fileCount = tierDist?.file_count || 0;
      const totalBytes = tierDist?.total_bytes || 0;
      const volumeGb = totalBytes / (1024 * 1024 * 1024);

      const storageRate = tierMeta?.storage_cost_per_gb ?? (
        tier === 'HOT' ? 0.023 : tier === 'WARM' ? 0.0125 : tier === 'COLD' ? 0.004 : 0.00099
      );
      const retrievalRate = tierMeta?.retrieval_cost_per_gb ?? (
        tier === 'HOT' ? 0.0 : tier === 'WARM' ? 0.01 : tier === 'COLD' ? 0.03 : 0.05
      );

      const monthlyStorageCost = volumeGb * storageRate;

      // Access frequency profile assumptions for retrieval exposure
      const retrievalFactor = tier === 'HOT' ? 0.25 : tier === 'WARM' ? 0.08 : tier === 'COLD' ? 0.015 : 0.002;
      const estRetrievalExposure = volumeGb * retrievalFactor * retrievalRate;
      const combinedMonthlyCost = monthlyStorageCost + estRetrievalExposure;
      const percentage = totalEstateBytes > 0 ? (totalBytes / totalEstateBytes) * 100 : 0;

      return {
        tier,
        color: tierColors[tier] || '#64748b',
        fileCount,
        totalBytes,
        volumeGb,
        storageRate,
        retrievalRate,
        monthlyStorageCost,
        retrievalFactor,
        estRetrievalExposure,
        combinedMonthlyCost,
        percentage: parseFloat(percentage.toFixed(1)),
      };
    });
  }, [dashboard, tiers]);

  const totalMatrixFiles = tierMatrixRows.reduce((acc, r) => acc + r.fileCount, 0);
  const totalMatrixBytes = tierMatrixRows.reduce((acc, r) => acc + r.totalBytes, 0);
  const totalMatrixStorageCost = tierMatrixRows.reduce((acc, r) => acc + r.monthlyStorageCost, 0);
  const totalMatrixRetrievalCost = tierMatrixRows.reduce((acc, r) => acc + r.estRetrievalExposure, 0);
  const totalMatrixCombinedCost = totalMatrixStorageCost + totalMatrixRetrievalCost;

  // Export JSON Optimization Audit with live data
  const handleExportData = () => {
    if (!dashboard || !roi) return;

    const auditPayload = {
      audit_meta: {
        timestamp: new Date().toISOString(),
        engine: 'NEXUS Intelligent Cloud Storage Optimizer v1.0',
        environment: 'Production Multi-Tier Cloud Storage (FastAPI + SQLite WAL)',
        telemetry_source: 'Live Backend Analytics Telemetry (/api/v1/analytics/dashboard)',
        selected_time_range: timeRange,
      },
      kpi_summary: {
        total_files: dashboard.overview.total_files,
        total_storage_bytes: dashboard.overview.total_bytes,
        total_storage_formatted: formatBytes(dashboard.overview.total_bytes),
        gross_duplicate_bytes: dashboard.overview.duplicate_wasted_bytes,
        gross_duplicate_files: dashboard.overview.duplicate_files_count,
        compressible_savings_bytes: roi.compression_recoverable_bytes,
        compressible_files_count: roi.compressible_files_count,
        current_monthly_spend_usd: roi.current_monthly_spend,
        projected_monthly_savings_usd: roi.total_projected_monthly_savings,
        projected_annual_savings_usd: roi.total_projected_annual_savings,
        overall_projected_savings_percentage: roi.overall_projected_savings_percentage,
        derived_optimization_health_score: derivedHealthScore,
      },
      tier_economics_matrix: tierMatrixRows.map((r) => ({
        tier: r.tier,
        file_count: r.fileCount,
        volume_bytes: r.totalBytes,
        volume_gb: parseFloat(r.volumeGb.toFixed(6)),
        storage_rate_per_gb_month: r.storageRate,
        monthly_storage_cost_usd: parseFloat(r.monthlyStorageCost.toFixed(6)),
        retrieval_rate_per_gb: r.retrievalRate,
        illustrative_retrieval_exposure_usd: parseFloat(r.estRetrievalExposure.toFixed(6)),
        projected_monthly_tco_usd: parseFloat(r.combinedMonthlyCost.toFixed(6)),
        storage_share_percent: r.percentage,
        retrieval_model_note: `Illustrative scenario assuming ${(r.retrievalFactor * 100).toFixed(1)}% monthly egress`,
      })),
      category_distribution: dashboard.category_distribution,
      size_brackets: dashboard.size_brackets,
      forward_spend_trajectory_projection: projectedChartData,
    };

    const blob = new Blob([JSON.stringify(auditPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_storage_optimization_audit_${timeRange.toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Storage Telemetry & Multi-Tier Analytics</h2>
          <p className="text-xs text-slate-500">Live analytical telemetry computed by FastAPI Pandas statistical pipeline</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalyticsData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live Analytics</span>
          </button>

          {downloadNotice && (
            <span className="text-xs font-semibold text-emerald-600 animate-in fade-in flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Downloaded JSON Audit
            </span>
          )}
          <button
            onClick={handleExportData}
            disabled={!dashboard || isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export Optimization Audit</span>
          </button>
        </div>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-3 text-red-800 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-900">Telemetry Fetch Error</h4>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchAnalyticsData}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 shadow-sm transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="nexus-card p-12 text-center space-y-4">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Aggregating Storage Telemetry</h4>
            <p className="text-xs text-slate-500">
              Executing statistical aggregations and cross-tier distribution queries from FastAPI backend...
            </p>
          </div>
        </div>
      ) : !dashboard || dashboard.overview.total_files === 0 ? (
        /* Empty State */
        <div className="nexus-card p-12 text-center space-y-3">
          <Layers className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Storage Objects Ingested Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload files into the NEXUS bucket to generate multi-tier capacity distributions, cost breakdowns, and compression analytics.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="nexus-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-slate-400">Optimization Health Score</p>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                  Derived
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-600">
                  {derivedHealthScore}/100
                </span>
                <span className="text-xs text-slate-500">
                  {derivedHealthScore >= 80 ? 'Tier A rating' : derivedHealthScore >= 60 ? 'Tier B rating' : 'Action Recommended'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${derivedHealthScore}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Derived from duplicate overhead ({dashboard.overview.duplicate_volume_percentage.toFixed(1)}%) & optimization potential
              </p>
            </div>

            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Gross Wasted Redundancy</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-amber-600">
                  {formatBytes(dashboard.overview.duplicate_wasted_bytes)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                {dashboard.overview.duplicate_files_count.toLocaleString()} duplicate copies ({dashboard.overview.duplicate_volume_percentage.toFixed(1)}% of volume)
              </p>
            </div>

            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Compressible Overhead</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-600">
                  {formatBytes(roi?.compression_recoverable_bytes || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                {(roi?.compressible_files_count || 0).toLocaleString()} compressible files
              </p>
            </div>

            <div className="nexus-card p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Net Monthly ROI</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-600">
                  +{formatCurrency(roi?.total_projected_monthly_savings || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                {(roi?.overall_projected_savings_percentage || 0).toFixed(1)}% projected bill reduction
              </p>
            </div>
          </div>

          {/* Row 1: Category Bar Chart & Tier Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Bar Chart with Dynamic Unit */}
            <div className="nexus-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Storage Volume by Category ({categoryUnit})</h3>
                  <p className="text-xs text-slate-500">Distribution across recognized file categories</p>
                </div>
                <span className="text-xs font-mono text-slate-400 font-semibold">
                  Total: {formatBytes(dashboard.overview.total_bytes)}
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val} ${categoryUnit}`} />
                    <Tooltip 
                      formatter={(val: number) => [`${val} ${categoryUnit}`, 'Volume']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="volume" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      {categoryBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tier Distribution Pie Chart */}
            <div className="nexus-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cloud Storage Tier Footprint</h3>
                  <p className="text-xs text-slate-500">HOT, WARM, COLD and ARCHIVE distribution</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>{tierPieData.length} Active Tiers</span>
                </div>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="total_bytes"
                    >
                      {tierPieData.map((entry, index) => (
                        <Cell key={`tier-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [formatBytes(val), 'Volume']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: File Size Histogram & Spending Projections with Time Range Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Size Distribution Histogram */}
            <div className="nexus-card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">File Size Distribution Histogram</h3>
                <p className="text-xs text-slate-500">Frequency binning across standard storage object brackets</p>
              </div>

              <div className="space-y-3 pt-2">
                {sizeBracketData.map((bracket) => (
                  <div key={bracket.bracket} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{bracket.bracket}</span>
                      <span className="font-mono text-slate-500">
                        {bracket.count.toLocaleString()} files ({bracket.formattedVolume})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${bracket.barPercent}%`, backgroundColor: bracket.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Comparison Projections with Time-Range Selector */}
            <div className="nexus-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Cumulative Spend & Savings Trajectory</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Forward Projection
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Projected baseline spend vs. optimized spend modeled over {timeRange} horizon
                  </p>
                </div>

                {/* Time-Range Filter Buttons */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
                  {(['30D', '90D', '6M', '1Y'] as TimeRange[]).map((range) => {
                    const isActive = timeRange === range;
                    return (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {range}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Savings Highlight Pill */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <span className="text-slate-600">Active Window: <strong className="text-slate-800">{timeRange} Projection Horizon</strong></span>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <TrendingDown className="w-4 h-4" />
                  <span>Projected Savings: {formatCurrency(roi?.total_projected_monthly_savings || 0)}/mo</span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      tickFormatter={formatAxisCurrency} 
                    />
                    <Tooltip 
                      formatter={(val: number, name: string) => [
                        formatCurrency(val), 
                        name === 'baseline' ? 'Projected Baseline Spend' : 'Projected Optimized Spend'
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-[11px] font-medium text-slate-600">
                          {value === 'baseline' ? 'Projected Baseline' : 'Projected Optimized'}
                        </span>
                      )}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="baseline" 
                      stroke="#94a3b8" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      fillOpacity={1} 
                      fill="url(#colorBase)" 
                      name="baseline" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="optimized" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorOpt)" 
                      name="optimized" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Tier-Wise Cost & Retrieval Exposure Table */}
          <div className="nexus-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Storage Tier Economics & Retrieval Exposure Matrix</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    TCO Analysis
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of at-rest storage rates and retrieval fees; exposure shown uses illustrative monthly access models
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Live Cloud SLA Rates</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold tracking-wider uppercase text-[10px]">
                    <th className="py-3.5 px-4">Storage Tier</th>
                    <th className="py-3.5 px-4">Active Objects</th>
                    <th className="py-3.5 px-4">Allocated Volume</th>
                    <th className="py-3.5 px-4">At-Rest Rate</th>
                    <th className="py-3.5 px-4">Monthly Storage Cost</th>
                    <th className="py-3.5 px-4">Retrieval Surcharge</th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <span>Est. Retrieval Exposure</span>
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      </div>
                      <span className="text-[9px] text-slate-400 font-normal lowercase block">
                        (model scenario)
                      </span>
                    </th>
                    <th className="py-3.5 px-4">
                      <span>Projected Monthly TCO</span>
                      <span className="text-[9px] text-slate-400 font-normal lowercase block">
                        (at-rest + model egress)
                      </span>
                    </th>
                    <th className="py-3.5 px-4">Capacity Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tierMatrixRows.map((row) => (
                    <tr key={row.tier} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <TierBadge tier={row.tier} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {row.fileCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatBytes(row.totalBytes)} <span className="text-[11px] text-slate-400">({row.volumeGb >= 0.0001 ? `${row.volumeGb.toFixed(4)} GB` : '< 0.0001 GB'})</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        ${row.storageRate.toFixed(4)}/GB
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {formatCurrency(row.monthlyStorageCost)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.retrievalRate === 0 ? (
                          <span className="text-emerald-600 font-medium">$0.00 (Free)</span>
                        ) : (
                          <span>${row.retrievalRate.toFixed(3)}/GB</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-700">
                        {formatCurrency(row.estRetrievalExposure)}
                        <span className="text-[10px] text-slate-400 block font-sans">
                          (Illustrative ~{(row.retrievalFactor * 100).toFixed(1)}% egress model)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(row.combinedMonthlyCost)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-1.5 rounded-full" 
                              style={{ width: `${row.percentage}%`, backgroundColor: row.color }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">{row.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                    <td className="py-3 px-4">Total Portfolio</td>
                    <td className="py-3 px-4 font-mono">{totalMatrixFiles.toLocaleString()} files</td>
                    <td className="py-3 px-4 font-mono">{formatBytes(totalMatrixBytes)}</td>
                    <td className="py-3 px-4 text-slate-400">—</td>
                    <td className="py-3 px-4 font-mono text-slate-900">{formatCurrency(totalMatrixStorageCost)}</td>
                    <td className="py-3 px-4 text-slate-400">—</td>
                    <td className="py-3 px-4 font-mono text-amber-700">{formatCurrency(totalMatrixRetrievalCost)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700">{formatCurrency(totalMatrixCombinedCost)}/mo</td>
                    <td className="py-3 px-4 font-mono text-slate-500">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p>
                <strong>Storage & Retrieval Pricing Note:</strong> Cold and Archive tiers feature significantly lower at-rest storage rates but incur per-GB retrieval surcharges when reading objects, alongside minimum retention requirements. Retrieval exposure figures shown above reflect illustrative planning models; actual retrieval expenses depend on actual data access and egress patterns.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
