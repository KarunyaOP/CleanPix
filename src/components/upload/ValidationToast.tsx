import React from "react";
import { AlertCircle, X } from "lucide-react";

export interface ValidationToastProps {
  error: {
    code: string;
    message: string;
    details?: string;
  } | null;
  onDismiss: () => void;
}

export const ValidationToast: React.FC<ValidationToastProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="w-full max-w-xl mx-auto mb-6 p-4 rounded-[16px] bg-[#1E112A]/90 backdrop-blur-xl border border-red-500/40 shadow-[0_8px_32px_rgba(239,68,68,0.25),0_0_20px_rgba(239,68,68,0.15)] flex items-start gap-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
        <AlertCircle size={18} />
      </div>

      <div className="flex-1 flex flex-col pr-2">
        <span className="text-sm font-semibold text-red-200 leading-snug">
          {error.message}
        </span>
        {error.details && (
          <span className="text-xs text-red-300/80 mt-1 leading-normal">
            {error.details}
          </span>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="p-1.5 rounded-chip text-red-300/70 hover:text-white hover:bg-red-500/20 transition-colors"
        aria-label="Dismiss error"
      >
        <X size={16} />
      </button>
    </div>
  );
};
