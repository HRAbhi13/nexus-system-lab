import React from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  Copy, 
  Minimize2, 
  Sparkles, 
  BarChart3, 
  Settings, 
  Database,
  Cpu,
  Cloud
} from 'lucide-react';
import { ActiveNavTab } from '../../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  duplicateCount?: number;
  compressionCount?: number;
  recommendationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  duplicateCount = 4,
  compressionCount = 5,
  recommendationCount = 6,
}) => {
  const navItems: {
    id: ActiveNavTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'files', label: 'File Manager', icon: FolderTree },
    { id: 'duplicates', label: 'Duplicate Detection', icon: Copy, badge: duplicateCount, badgeColor: 'bg-amber-500/20 text-amber-300' },
    { id: 'compression', label: 'Compression Advisor', icon: Minimize2, badge: compressionCount, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'optimizer', label: 'Storage Optimizer', icon: Sparkles, badge: recommendationCount, badgeColor: 'bg-blue-500/20 text-blue-300' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800/80 flex flex-col shrink-0 select-none text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-wider text-white">NEXUS</span>
              <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-semibold">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Web Console</p>
          </div>
        </div>

        <div className="mt-3 py-1.5 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-slate-300 truncate">
            Smarter Storage. Optimized Future.
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Management & Intelligence
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-navy-950/60 space-y-3">
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" /> Storage Engine
            </span>
            <span className="text-emerald-400 font-mono font-semibold">Active</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Fast API Engine
            </span>
            <span className="text-slate-300 font-mono">Port 8000</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
          <span>College Engineering Lab</span>
          <span className="text-slate-400 font-mono">Simulated S3</span>
        </div>
      </div>
    </aside>
  );
};
