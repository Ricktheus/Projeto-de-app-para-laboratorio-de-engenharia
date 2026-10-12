import { BigButton, type BigButtonProps } from './BigButton';

export interface LoadingButtonProps extends BigButtonProps {
  loading?: boolean;
  /** Label shown while `loading` (defaults to the children). */
  loadingLabel?: string;
}

/** Inline spinner (no external asset); inherits the button's text colour. */
function Spinner() {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
    />
  );
}

/**
 * Submit button that owns the Loading UI-state (SPEC §3.0): while `loading` it
 * becomes `disabled` and shows an inline spinner, which structurally prevents
 * the double submission the spec forbids. Reused by every write form (F-S003-3).
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  disabled = false,
  children,
  icon,
  ...rest
}: LoadingButtonProps) {
  return (
    <BigButton
      disabled={disabled || loading}
      aria-busy={loading}
      icon={loading ? undefined : icon}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </BigButton>
  );
}
