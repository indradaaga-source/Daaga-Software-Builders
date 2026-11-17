import React from 'react';
import { X } from 'lucide-react';
import { useStudio } from '../context/StudioContext';

export const StudioToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStudio();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-[#0B1D3A] text-white border border-[#1E3A6E] rounded-lg px-4 py-3 shadow-lg flex items-start justify-between gap-3"
        >
          <div className="space-y-0.5">
            <div className="text-xs sm:text-sm font-semibold">{toast.message}</div>
            {toast.detail && <div className="text-xs text-[#BFDBFE]">{toast.detail}</div>}
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-[#93C5FD] hover:text-white p-0.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
