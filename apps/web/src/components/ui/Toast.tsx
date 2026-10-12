import { useEffect, type ReactNode } from 'react';

import { useToastStore, type ToastItem, type ToastVariant } from '../../stores/toast-store';
import { CheckCircle, Info, WarningCircle, X } from '../icons';

const VARIANT_ICON: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle size={18} weight="fill" className="text-[#3DD68C]" />,
  error: <WarningCircle size={18} weight="fill" className="text-[#FF6B6B]" />,
  info: <Info size={18} weight="fill" className="text-[#7C9BFF]" />,
};

const AUTO_DISMISS_MS = 5_000;

/** Hook exposing the imperative toast API (SPEC §3.0 Success / Error states). */
export function useToast() {
  return { show: useToastStore((s) => s.show), dismiss: useToastStore((s) => s.dismiss) };
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={[
        'pointer-events-auto flex animate-slide-in items-center gap-3 rounded-xl bg-grafite px-4 py-3 text-white shadow-raised',
      ].join(' ')}
    >
      <span aria-hidden className="flex shrink-0">
        {VARIANT_ICON[toast.variant]}
      </span>
      <span className="text-field">{toast.message}</span>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => dismiss(toast.id)}
        className="ml-auto rounded p-1 text-concreto-300 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Renders the global toast queue. Mount once near the app root; components and
 * route guards push messages through {@link useToast} / the toast store.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
