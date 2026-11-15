import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2,
  TrendingDown,
  Layers,
  AlertCircle,
  HelpCircle
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
  MOCK_CATEGORY_METRICS, 
  MOCK_TIER_METRICS, 
  MOCK_SIZE_BRACKETS, 
  MOCK_METRICS, 
  TIER_RATES,
  TIER_RETRIEVAL_RATES,
  MOCK_HISTORICAL_COSTS_BY_RANGE,
  formatBytes, 
  formatCurrency 
} from '../../data/mockData';
import { TierBadge } from '../common/TierBadge';
import { TimeRange } from '../../types';

export const AnalyticsView: React.FC = () => {
  const [downloadNotice, setDownloadNotice] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  const categoryBarData = MOCK_CATEGORY_METRICS.map((c) => ({
    name: c.category,
    volume_gb: parseFloat((c.total_bytes / (1024 * 1024 * 1024)).toFixed(1)),
    files: c.file_count,
    color: c.color,
  }));

  const historicalChartData = MOCK_HISTORICAL_COSTS_BY_RANGE[timeRange];

  // Calculate table rows with storage & retrieval economics
  const tierMatrixRows = MOCK_TIER_METRICS.map((metric) => {
    const volumeGb = metric.total_bytes / (1024 * 1024 * 1024);
    const storageRate = TIER_RATES[metric.tier];
    const retrievalRate = TIER_RETRIEVAL_RATES[metric.tier];
    const monthlyStorageCost = metric.monthly_cost;

    // Simulated monthly retrieval percentage based on tier access profile
    const retrievalFactor = metric.tier === 'HOT' ? 0.25 : metric.tier === 'WARM' ? 0.08 : metric.tier === 'COLD' ? 0.015 : 0.002;
    const estRetrievalExposure = volumeGb * retrievalFactor * retrievalRate;
    const combinedMonthlyCost = monthlyStorageCost + estRetrievalExposure;

    return {
      tier: metric.tier,
      color: metric.color,
      fileCount: metric.file_count,
      totalBytes: metric.total_bytes,
      volumeGb,
      storageRate,
      retrievalRate,
      monthlyStorageCost,
      retrievalFactor,
      estRetrievalExposure,
      combinedMonthlyCost,
      percentage: metric.percentage,
    };
  });

  const totalMatrixFiles = tierMatrixRows.reduce((acc, r) => acc + r.fileCount, 0);
  const totalMatrixBytes = tierMatrixRows.reduce((acc, r) => acc + r.totalBytes, 0);
  const totalMatrixStorageCost = tierMatrixRows.reduce((acc, r) => acc + r.monthlyStorageCost, 0);
  const totalMatrixRetrievalCost = tierMatrixRows.reduce((acc, r) => acc + r.estRetrievalExposure, 0);
  const totalMatrixCombinedCost = totalMatrixStorageCost + totalMatrixRetrievalCost;

  const handleExportData = () => {
    const auditPayload = {
      audit_meta: {
        timestamp: new Date().toISOString(),
        engine: 'NEXUS Intelligent Cloud Storage Optimizer v1.0',
        environment: 'Production Multi-Tier Cloud Storage (S3 / GCS / Azure Blob)',
        telemetry_source: 'In-Memory Metadata Catalog Pipeline',
        selected_time_range: timeRange,
      },
      kpi_summary: {
        total_files: MOCK_METRICS.total_files,
        total_storage_bytes: MOCK_METRICS.total_bytes,
        total_storage_formatted: formatBytes(MOCK_METRICS.total_bytes),
        gross_duplicate_bytes: MOCK_METRICS.duplicate_bytes,
        compressible_savings_bytes: MOCK_METRICS.compression_savings_bytes,
        current_monthly_spend_usd: MOCK_METRICS.current_monthly_spend,
        projected_monthly_spend_usd: MOCK_METRICS.projected_monthly_spend,
        projected_monthly_savings_usd: MOCK_METRICS.projected_monthly_savings,
        optimization_health_score: MOCK_METRICS.optimization_health_score,
      },
      tier_economics_matrix: tierMatrixRows.map((r) => ({
        tier: r.tier,
        file_count: r.fileCount,
        volume_bytes: r.totalBytes,
        volume_gb: parseFloat(r.volumeGb.toFixed(2)),
        storage_rate_per_gb_month: r.storageRate,
        monthly_storage_cost_usd: parseFloat(r.monthlyStorageCost.toFixed(2)),
        retrieval_rate_per_gb: r.retrievalRate,
        simulated_retrieval_exposure_usd: parseFloat(r.estRetrievalExposure.toFixed(2)),
        combined_monthly_tco_usd: parseFloat(r.combinedMonthlyCost.toFixed(2)),
        storage_share_percent: r.percentage,
      })),
      category_distribution: MOCK_CATEGORY_METRICS.map((c) => ({
        category: c.category,
        file_count: c.file_count,
        total_bytes: c.total_bytes,
        share_percent: c.percentage,
      })),
      size_brackets: MOCK_SIZE_BRACKETS,
      historical_projection: historicalChartData,
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
          <p className="text-xs text-slate-500">In-memory aggregations modeled on Pandas DataFrame analytical pipelines</p>
        </div>

        <div className="flex items-center gap-3">
          {downloadNotice && (
            <span className="text-xs font-semibold text-emerald-600 animate-in fade-in flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Downloaded JSON Audit
            </span>
          )}
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export Optimization Audit</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Optimization Health Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {MOCK_METRICS.optimization_health_score}/100
            </span>
            <span className="text-xs text-slate-500">Tier A rating</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full" 
              style={{ width: `${MOCK_METRICS.optimization_health_score}%` }} 
            />
          </div>
        </div>

        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Gross Wasted Redundancy</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-600">{formatBytes(MOCK_METRICS.duplicate_bytes)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">1,840 duplicate copies</p>
        </div>

        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Compressible Overhead</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-blue-600">{formatBytes(MOCK_METRICS.compression_savings_bytes)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">4,210 compressible files</p>
        </div>

        <div className="nexus-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Net Monthly ROI</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600">+{formatCurrency(MOCK_METRICS.projected_monthly_savings)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">45.0% bill reduction</p>
        </div>
      </div>

      {/* Row 1: Category Bar Chart & Tier Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Storage Volume by Category (GB)</h3>
              <p className="text-xs text-slate-500">Distribution across 8 canonical file categories</p>
            </div>
            <span className="text-xs font-mono text-slate-400 font-semibold">Total: {formatBytes(MOCK_METRICS.total_bytes)}</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val} GB`} />
                <Tooltip 
                  formatter={(val: number) => [`${val} GB`, 'Volume']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="volume_gb" fill="#3b82f6" radius={[6, 6, 0, 0]}>
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
              <span>4 Active Tiers</span>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_TIER_METRICS}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="total_bytes"
                >
                  {MOCK_TIER_METRICS.map((entry, index) => (
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
            {MOCK_SIZE_BRACKETS.map((bracket) => {
              const maxCount = 6500;
              const barPercent = (bracket.count / maxCount) * 100;

              return (
                <div key={bracket.bracket} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{bracket.bracket}</span>
                    <span className="font-mono text-slate-500">
                      {bracket.count.toLocaleString()} files ({bracket.total_gb} GB)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${barPercent}%`, backgroundColor: bracket.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Comparison Projections with Time-Range Selector */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Cumulative Spend & Savings Trajectory</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500">Unoptimized baseline spend vs. NEXUS algorithmic optimization</p>
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
            <span className="text-slate-600">Active Window: <strong className="text-slate-800">{timeRange} Telemetry</strong></span>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
              <TrendingDown className="w-4 h-4" />
              <span>Projected Savings: {formatCurrency(MOCK_METRICS.projected_monthly_savings)}/mo</span>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  formatter={(val: number, name: string) => [
                    `$${val.toFixed(2)}`, 
                    name === 'baseline' ? 'Unoptimized Baseline' : 'Optimized Spend'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-[11px] font-medium text-slate-600">
                      {value === 'baseline' ? 'Baseline Spend' : 'NEXUS Optimized'}
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
              Breakdown of at-rest storage rates vs. egress retrieval risk based on empirical access frequency profiles
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Standard SLA Pricing Matrix</span>
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
                </th>
                <th className="py-3.5 px-4">Net Monthly TCO</th>
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
                    {formatBytes(row.totalBytes)} <span className="text-[11px] text-slate-400">({row.volumeGb.toFixed(1)} GB)</span>
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
                      ~{(row.retrievalFactor * 100).toFixed(1)}% egress
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
            <strong>Retrieval Cost Note:</strong> Cold and Archive tiers incur per-GB access fees when reading objects. NEXUS analyzes empirical access timestamps to guarantee that lifecycle migration recommendations yield net-positive monthly ROI accounting for egress frequency.
          </p>
        </div>
      </div>
    </div>
  );
};
