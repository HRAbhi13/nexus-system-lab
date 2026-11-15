import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Flame, 
  Sun, 
  Snowflake, 
  Archive,
  Sliders
} from 'lucide-react';
import { TierRecommendation, StorageTier } from '../../types';
import { TierBadge } from '../common/TierBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { formatBytes, formatCurrency } from '../../data/mockData';

interface StorageOptimizerViewProps {
  recommendations: TierRecommendation[];
  onApplyRecommendation: (fileId: string, newTier: StorageTier) => void;
  onApplyAllRecommendations: () => void;
}

export const StorageOptimizerView: React.FC<StorageOptimizerViewProps> = ({
  recommendations,
  onApplyRecommendation,
  onApplyAllRecommendations,
}) => {
  // Destination Tier Filter State
  const [targetTierFilter, setTargetTierFilter] = useState<'ALL' | 'WARM' | 'COLD' | 'ARCHIVE'>('ALL');

  // Interactive Inactivity Threshold Slider State (default 30 days)
  const [thresholdDays, setThresholdDays] = useState<number>(30);

  // Filter recommendations based on destination tier and threshold slider
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((r) => {
      const matchTier = targetTierFilter === 'ALL' || r.recommended_tier === targetTierFilter;
      const matchThreshold = r.inactivity_days >= thresholdDays;
      return matchTier && matchThreshold;
    });
  }, [recommendations, targetTierFilter, thresholdDays]);

  const totalMonthlySavings = useMemo(() => {
    return filteredRecommendations.reduce((acc, r) => acc + r.projected_monthly_savings, 0);
  }, [filteredRecommendations]);

  const oneYearSavings = totalMonthlySavings * 12;
  const threeYearSavings = totalMonthlySavings * 36;

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
      minDays: '365 Days',
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
            <button
              onClick={onApplyAllRecommendations}
              disabled={filteredRecommendations.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/25"
            >
              <Zap className="w-4 h-4" />
              <span>Apply All ({filteredRecommendations.length}) Tier Migrations</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Projected Monthly Savings: <span className="text-emerald-400 font-mono font-bold">+{formatCurrency(totalMonthlySavings)}/mo</span>
            </span>
          </div>
        </div>
      </div>

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
            <p className="text-[10px] text-blue-600 mt-1">Annualized cloud savings</p>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
            <p className="text-[11px] font-semibold uppercase text-purple-800">3-Year Cumulative ROI</p>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">+{formatCurrency(threeYearSavings)}</p>
            <p className="text-[10px] text-purple-600 mt-1">Compounded storage return</p>
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="nexus-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Tier Migration Recommendations ({filteredRecommendations.length})</h3>
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
              No dormant files currently exceed the {thresholdDays}-day inactivity threshold for {targetTierFilter === 'ALL' ? 'any tier' : targetTierFilter}.
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
                  onClick={() => onApplyRecommendation(rec.file.id, rec.recommended_tier)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shadow-blue-600/20 shrink-0"
                >
                  Migrate to {rec.recommended_tier}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
