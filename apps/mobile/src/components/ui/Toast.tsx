import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useToastStore, type ToastItem, type ToastVariant } from '../../stores/toast-store';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-neutral',
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
    <Pressable
      onPress={() => dismiss(toast.id)}
      accessibilityRole={toast.variant === 'error' ? 'alert' : 'text'}
      className={`w-full rounded-2xl px-4 py-3 ${VARIANT_CLASSES[toast.variant]}`}
    >
      <Text style={{ fontSize: 16 }} className="font-medium text-white">
        {toast.message}
      </Text>
    </Pressable>
  );
}

/**
 * Renders the global toast queue. Mount once near the app root; components and
 * route guards push messages through {@link useToast} / the toast store.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) {
    return null;
  }
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-12 z-50 gap-2 px-4"
      style={{ position: 'absolute' }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </View>
  );
}
