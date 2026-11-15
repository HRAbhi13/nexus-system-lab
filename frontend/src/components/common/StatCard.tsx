import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  trend,
  highlight = false,
}) => {
  return (
    <div className={`nexus-card nexus-card-hover p-5 relative overflow-hidden ${
      highlight ? 'border-blue-200 bg-gradient-to-br from-white via-white to-blue-50/30' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</h3>
            {subValue && (
              <span className="text-xs text-slate-500 font-normal">{subValue}</span>
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor} shadow-sm shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          <span className={`inline-flex items-center font-semibold px-1.5 py-0.5 rounded text-[11px] ${
            trend.isPositive 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-rose-50 text-rose-700'
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3 mr-0.5" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-0.5" />
            )}
            {trend.value}
          </span>
          {trend.label && (
            <span className="text-slate-400 font-normal">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
};
