import React from 'react';
import { StorageTier } from '../../types';
import { Flame, Sun, Snowflake, Archive } from 'lucide-react';

interface TierBadgeProps {
  tier: StorageTier;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPrice?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ 
  tier, 
  showIcon = true, 
  size = 'md',
  showPrice = false 
}) => {
  const configs = {
    HOT: {
      label: 'HOT',
      rate: '$0.023/GB',
      icon: Flame,
      classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
      iconClass: 'text-rose-500',
    },
    WARM: {
      label: 'WARM',
      rate: '$0.0125/GB',
      icon: Sun,
      classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
      iconClass: 'text-amber-500',
    },
    COLD: {
      label: 'COLD',
      rate: '$0.004/GB',
      icon: Snowflake,
      classes: 'bg-sky-50 text-sky-700 border-sky-200/80',
      iconClass: 'text-sky-500',
    },
    ARCHIVE: {
      label: 'ARCHIVE',
      rate: '$0.00099/GB',
      icon: Archive,
      classes: 'bg-purple-50 text-purple-700 border-purple-200/80',
      iconClass: 'text-purple-500',
    },
  };

  const config = configs[tier];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-md border font-mono tracking-tight ${config.classes} ${sizeClasses[size]}`}>
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
      {showPrice && <span className="opacity-75 font-normal ml-1">({config.rate})</span>}
    </span>
  );
};
