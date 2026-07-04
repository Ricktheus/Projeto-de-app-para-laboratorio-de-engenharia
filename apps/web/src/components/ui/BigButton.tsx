import { type ButtonHTMLAttributes } from 'react';

export type BigButtonVariant = 'primary' | 'danger' | 'neutral';

const VARIANT_CLASSES: Record<BigButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-dark active:bg-brand-dark',
  danger: 'bg-danger text-danger-fg hover:brightness-95 active:brightness-90',
  neutral: 'bg-neutral text-neutral-fg hover:brightness-110 active:brightness-95',
};

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BigButtonVariant;
  fullWidth?: boolean;
}

/**
 * Large, high-contrast primary action button (F-S003-3). Enforces the ergonomic
 * baseline of SPEC §1.3: >= 56dp touch target, AA+ contrast, >= 18sp text — sized
 * for gloved / dirty hands.
 */
export function BigButton({
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  disabled = false,
  ...rest
}: BigButtonProps) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      disabled={disabled}
      className={[
        'min-h-touch inline-flex items-center justify-center gap-2 rounded-xl px-6',
        'text-field font-semibold shadow-sm transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
