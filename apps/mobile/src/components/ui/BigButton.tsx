import { type ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

export type BigButtonVariant = 'primary' | 'danger' | 'neutral';

/** >= 56dp touch target — the ergonomic baseline of SPEC §1.3 (gloved hands). */
const MIN_TOUCH_DP = 56;

const VARIANT_CLASSES: Record<BigButtonVariant, string> = {
  primary: 'bg-brand active:bg-brand-dark',
  danger: 'bg-danger active:opacity-90',
  neutral: 'bg-neutral active:opacity-90',
};

export interface BigButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: BigButtonVariant;
  /** Node rendered before the label (e.g. a spinner). */
  accessoryLeft?: ReactNode;
}

/**
 * Large, high-contrast primary button (F-S003-3). The 56dp minimum height and
 * 18sp label are set inline so the ergonomic constraint holds regardless of the
 * styling engine; colors come from the shared NativeWind tokens.
 */
export function BigButton({
  label,
  variant = 'primary',
  accessoryLeft,
  disabled = false,
  ...rest
}: BigButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={{ minHeight: MIN_TOUCH_DP, opacity: disabled ? 0.6 : 1 }}
      className={`w-full flex-row items-center justify-center gap-2 rounded-2xl px-6 ${VARIANT_CLASSES[variant]}`}
      {...rest}
    >
      {accessoryLeft ? <View>{accessoryLeft}</View> : null}
      <Text style={{ fontSize: 18 }} className="font-semibold text-white">
        {label}
      </Text>
    </Pressable>
  );
}
