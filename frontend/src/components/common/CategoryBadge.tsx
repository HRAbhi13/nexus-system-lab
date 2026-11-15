import React from 'react';
import { FileCategory } from '../../types';
import { 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Package, 
  Code2, 
  Database, 
  File 
} from 'lucide-react';

interface CategoryBadgeProps {
  category: FileCategory;
  showIcon?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, showIcon = true }) => {
  const configs: Record<FileCategory, { icon: React.ElementType; classes: string }> = {
    Document: { icon: FileText, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Image: { icon: ImageIcon, classes: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    Video: { icon: Film, classes: 'bg-pink-50 text-pink-700 border-pink-200' },
    Audio: { icon: Music, classes: 'bg-violet-50 text-violet-700 border-violet-200' },
    Archive: { icon: Package, classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    Code: { icon: Code2, classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    Data: { icon: Database, classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    Other: { icon: File, classes: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const config = configs[category] || configs.Other;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.classes}`}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{category}</span>
    </span>
  );
};
