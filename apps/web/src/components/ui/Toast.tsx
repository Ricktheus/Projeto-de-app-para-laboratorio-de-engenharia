import { useEffect } from 'react';

import { useToastStore, type ToastItem, type ToastVariant } from '../../stores/toast-store';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-success text-success-fg',
  error: 'bg-danger text-danger-fg',
  info: 'bg-neutral text-neutral-fg',
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
        'pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg',
        VARIANT_CLASSES[toast.variant],
      ].join(' ')}
    >
      <span className="text-field">{toast.message}</span>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => dismiss(toast.id)}
        className="ml-auto rounded p-1 text-xl leading-none opacity-80 hover:opacity-100"
      >
        ×
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
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-md flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
