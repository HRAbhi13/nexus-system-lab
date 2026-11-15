import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: CheckCircle2,
          info: Info,
          warning: AlertCircle,
        };
        const colors = {
          success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          info: 'bg-blue-50 border-blue-200 text-blue-900',
          warning: 'bg-amber-50 border-amber-200 text-amber-900',
        };
        const iconColors = {
          success: 'text-emerald-600',
          info: 'text-blue-600',
          warning: 'text-amber-600',
        };

        const Icon = icons[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${colors[toast.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[toast.type]}`} />
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-bold">{toast.title}</h4>
              <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
