import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useUiStore, type Toast } from '../../store/useUiStore.ts';

const TOAST_LIFETIME_MS = 4000;

const toneStyles: Record<Toast['tone'], string> = {
  info: 'border-[#32A7D9]/50',
  success: 'border-[#18C6AD]/60',
  warning: 'border-[var(--ap-warn-border)]',
};

const ToastIcon: React.FC<{ tone: Toast['tone'] }> = ({ tone }) => {
  if (tone === 'success') return <CheckCircle2 className="w-4 h-4 text-[#18C6AD] shrink-0" aria-hidden="true" />;
  if (tone === 'warning') return <AlertTriangle className="w-4 h-4 text-[var(--ap-warn)] shrink-0" aria-hidden="true" />;
  return <Info className="w-4 h-4 text-[#32A7D9] shrink-0" aria-hidden="true" />;
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.id), TOAST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-[var(--ap-surface)] text-[var(--ap-text)] shadow-xl px-4 py-2.5 text-sm font-medium ${toneStyles[toast.tone]}`}
    >
      <ToastIcon tone={toast.tone} />
      <span className="min-w-0">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="ml-1 p-1 rounded-md text-[var(--ap-muted)] hover:text-[var(--ap-text)] hover:bg-[var(--ap-surface-2)] cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/** Bottom-centre stack of short-lived confirmations. Announced politely to screen readers. */
export const Toaster: React.FC = () => {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none no-print"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
