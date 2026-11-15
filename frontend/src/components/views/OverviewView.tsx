import React from 'react';
import { 
  HardDrive, 
  Files, 
  Copy, 
  DollarSign, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Minimize2, 
  Zap,
  Info
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { StatCard } from '../common/StatCard';
import { 
  MOCK_METRICS, 
  MOCK_HISTORICAL_COSTS, 
  MOCK_TIER_METRICS, 
  MOCK_ACTIVITIES, 
  formatBytes, 
  formatCurrency 
} from '../../data/mockData';
import { ActiveNavTab } from '../../types';

interface OverviewViewProps {
  onNavigate: (tab: ActiveNavTab) => void;
  onOpenUpload: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate, onOpenUpload }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-blue-900 via-navy-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Optimization Engine Active</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            NEXUS Cloud Storage Intelligence Platform
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Identified <span className="text-amber-400 font-semibold">{MOCK_METRICS.duplicate_files_count} duplicate files</span> and <span className="text-emerald-400 font-semibold">{formatBytes(MOCK_METRICS.duplicate_bytes)} redundant storage</span>. Apply intelligent tiering and deduplication to reduce your monthly cloud spend by <span className="text-emerald-400 font-bold">{MOCK_METRICS.savings_percentage}%</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('optimizer')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30"
          >
            <span>Run Optimizer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenUpload}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
          >
            Ingest Object
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Storage Footprint"
          value={formatBytes(MOCK_METRICS.total_bytes)}
          subValue="Across 4 Cloud Tiers"
          icon={HardDrive}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          trend={{ value: '+4.2%', isPositive: false, label: 'month-over-month' }}
        />
        <StatCard
          title="Indexed File Objects"
          value={MOCK_METRICS.total_files.toLocaleString()}
          subValue="8 File Categories"
          icon={Files}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          trend={{ value: '+1,240', isPositive: false, label: 'new this cycle' }}
        />
        <StatCard
          title="Wasted Redundant Storage"
          value={formatBytes(MOCK_METRICS.duplicate_bytes)}
          subValue={`${MOCK_METRICS.duplicate_files_count} Duplicate Copies`}
          icon={Copy}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: '21.9%', isPositive: false, label: 'of total storage is duplicate' }}
        />
        <StatCard
          title="Projected Monthly Savings"
          value={formatCurrency(MOCK_METRICS.projected_monthly_savings)}
          subValue={`Est. ${MOCK_METRICS.savings_percentage}% Cost Cut`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          highlight={true}
          trend={{ value: `-$${MOCK_METRICS.projected_monthly_savings}/mo`, isPositive: true, label: 'after optimization' }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Optimization Projection Chart */}
        <div className="lg:col-span-2 nexus-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cloud Storage Spend Projections</h3>
              <p className="text-xs text-slate-500">Historical baseline spend vs. intelligent tiering & deduplication savings</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                Baseline Spend
              </span>
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Optimized Spend
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HISTORICAL_COSTS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  formatter={(val: number) => [`$${val.toFixed(2)}/mo`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" name="Baseline" />
                <Area type="monotone" dataKey="optimized" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOptimized)" name="Optimized" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Current monthly spend is <span className="font-bold text-slate-800">{formatCurrency(MOCK_METRICS.current_monthly_spend)}</span>. Projected optimized spend is <span className="font-bold text-emerald-700">{formatCurrency(MOCK_METRICS.projected_monthly_spend)}</span>.</span>
            </div>
            <button 
              onClick={() => onNavigate('analytics')}
              className="text-blue-600 hover:text-blue-700 font-semibold shrink-0"
            >
              View Analytics &rarr;
            </button>
          </div>
        </div>

        {/* Storage Tier Distribution Pie / Cards */}
        <div className="nexus-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Storage Tier Distribution</h3>
            <p className="text-xs text-slate-500">Current allocation across 4 storage classes</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_TIER_METRICS}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="total_bytes"
                >
                  {MOCK_TIER_METRICS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [formatBytes(val), 'Volume']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {MOCK_TIER_METRICS.map((t) => (
              <div key={t.tier} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-medium text-slate-700">{t.tier}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">{formatBytes(t.total_bytes)}</span>
                  <span className="font-semibold text-slate-800 w-12 text-right">{t.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Cards & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Actions */}
        <div className="nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Optimization Quick Wins</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              3 Opportunities
            </span>
          </div>

          <div className="space-y-3">
            {/* Duplicates Win */}
            <div 
              onClick={() => onNavigate('duplicates')}
              className="p-3.5 bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 hover:border-amber-300 rounded-xl cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800">Deduplicate Identical Files</h4>
                    <p className="text-[11px] text-slate-500">4 hash clusters with {formatBytes(MOCK_METRICS.duplicate_bytes)} redundant data</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Lifecycle Win */}
            <div 
              onClick={() => onNavigate('optimizer')}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-xl cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-800">Tier Lifecycle Migration</h4>
                    <p className="text-[11px] text-slate-500">6 files unaccessed for &gt;90 days in expensive HOT tier</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Compression Win */}
            <div 
              onClick={() => onNavigate('compression')}
              className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-300 rounded-xl cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Minimize2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">Compress Text & Log Files</h4>
                    <p className="text-[11px] text-slate-500">Up to 75% byte reduction using Zstandard/Gzip</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="lg:col-span-2 nexus-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Storage Activity</h3>
              <p className="text-xs text-slate-500">Live feed of ingestion, hash auditing, and tier evaluations</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Real-time Simulation
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {MOCK_ACTIVITIES.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{act.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{act.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">{act.timestamp}</span>
                  {act.savings && (
                    <p className="text-[11px] font-semibold text-emerald-600 mt-0.5 font-mono">{act.savings}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
