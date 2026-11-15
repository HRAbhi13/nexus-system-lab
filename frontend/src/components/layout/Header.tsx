import React from 'react';
import { 
  Upload, 
  Sparkles, 
  Globe 
} from 'lucide-react';
import { ActiveNavTab } from '../../types';

interface HeaderProps {
  activeTab: ActiveNavTab;
  onOpenUpload: () => void;
  onNavigateToTab: (tab: ActiveNavTab) => void;
  healthScore?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenUpload,
  onNavigateToTab,
  healthScore = 79,
}) => {
  const titles: Record<ActiveNavTab, { title: string; subtitle: string }> = {
    overview: { title: 'Executive Overview', subtitle: 'Storage utilization, cost metrics, and optimization telemetry' },
    files: { title: 'File Management', subtitle: 'Browse, filter, and inspect objects in simulated cloud storage' },
    duplicates: { title: 'Cryptographic Duplicate Detection', subtitle: 'Exact SHA-256 hash match clusters and reclaimable storage' },
    compression: { title: 'Compression Advisor', subtitle: 'Format entropy analysis and algorithmic byte reduction heuristics' },
    optimizer: { title: 'Lifecycle Tier Optimizer', subtitle: 'HOT, WARM, COLD and ARCHIVE automated reallocation policies' },
    analytics: { title: 'Storage Analytics & Trends', subtitle: 'High-performance volume distribution and cost forecasting' },
    settings: { title: 'System Settings', subtitle: 'Cloud rates, inactivity thresholds, and backend API configuration' },
  };

  const current = titles[activeTab] || titles.overview;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-10 sticky top-0">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>NEXUS</span>
          <span>/</span>
          <span className="capitalize text-slate-600 font-medium">{activeTab}</span>
        </div>
        <h1 className="text-base font-bold text-slate-900 leading-tight">{current.title}</h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Cloud Region Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>Simulated US-East-1 (S3 Engine)</span>
        </div>

        {/* Health Score Pill */}
        <div 
          onClick={() => onNavigateToTab('analytics')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold cursor-pointer hover:bg-emerald-100/60 transition-colors"
          title="Calculated efficiency score based on duplicate removal and tier distribution"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Health: {healthScore}/100</span>
        </div>

        {/* Upload Action Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all shadow-blue-600/20"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Ingest File</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-slate-200" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-inner">
            NX
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">Engineering Console</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Admin Developer</p>
          </div>
        </div>
      </div>
    </header>
  );
};
