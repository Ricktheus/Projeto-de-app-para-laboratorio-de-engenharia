import { ActivityIndicator } from 'react-native';

import { BigButton, buttonTextColor, type BigButtonProps } from './BigButton';

export interface LoadingButtonProps extends BigButtonProps {
  loading?: boolean;
  /** Label shown while `loading` (defaults to the base label). */
  loadingLabel?: string;
}

/**
 * Submit button owning the Loading UI-state (SPEC §3.0): while `loading` it is
 * disabled and shows a spinner, which prevents the double submission the spec
 * forbids. Reused by every write form (F-S003-3).
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  label,
  disabled = false,
  variant = 'primary',
  ...rest
}: LoadingButtonProps) {
  return (
    <BigButton
      label={loading ? (loadingLabel ?? label) : label}
      variant={variant}
      disabled={disabled || loading}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessoryLeft={
        loading ? (
          <ActivityIndicator color={buttonTextColor(variant)} testID="loading-spinner" />
        ) : null
      }
      {...rest}
    />
  );
}
