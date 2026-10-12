import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useToastStore, type ToastItem, type ToastVariant } from '../../stores/toast-store';
import { COLORS, FONTS } from '../../theme/tokens';

/** Status rail colour; the toast itself is graphite (plan §6.7). */
const VARIANT_RAIL: Record<ToastVariant, string> = {
  success: COLORS.successDark,
  error: COLORS.dangerDark,
  info: COLORS.sinal,
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
      style={{ borderLeftWidth: 4, borderLeftColor: VARIANT_RAIL[toast.variant] }}
      className="w-full rounded-xl bg-grafite px-4 py-3"
    >
      <Text style={{ fontSize: 16, fontFamily: FONTS.sansMedium }} className="text-white">
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
