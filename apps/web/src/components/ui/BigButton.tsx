import { type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * Button variants of the "Concreto & Sinalização" kit (plan §6.7).
 * - `primary`: graphite — the default primary action.
 * - `accent`: signal yellow — ONLY the "act now" action (max one per screen).
 * - `neutral`: outlined secondary action.
 * - `ghost`: low-emphasis inline action.
 * - `danger`: destructive action.
 */
export type BigButtonVariant = 'primary' | 'accent' | 'neutral' | 'ghost' | 'danger';
export type BigButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<BigButtonVariant, string> = {
  primary: 'bg-ink text-ink-fg shadow-card hover:opacity-90 active:opacity-80',
  accent:
    'bg-sinal-500 text-grafite shadow-card ring-1 ring-inset ring-sinal-600 hover:bg-sinal-600 active:bg-sinal-600',
  neutral:
    'border border-concreto-200 bg-surface text-ink shadow-card hover:border-concreto-300 hover:bg-concreto-25 active:bg-concreto-50',
  ghost: 'text-concreto-600 hover:bg-concreto-50 hover:text-ink',
  danger: 'bg-danger text-white shadow-card hover:brightness-95 active:brightness-90',
};

const SIZE_CLASSES: Record<BigButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'min-h-touch gap-2 px-4 text-field',
  lg: 'h-12 gap-2 px-6 text-base',
};

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BigButtonVariant;
  size?: BigButtonSize;
  fullWidth?: boolean;
  /** Leading icon (Phosphor element). */
  icon?: ReactNode;
}

/**
 * The kit's button (F-S003-3, redesigned). Keeps the `min-h-touch` target and AA
 * contrast of the original, at office density; the gloved-hand sizes live in the
 * mobile app.
 */
export function BigButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  type = 'button',
  disabled = false,
  children,
  ...rest
}: BigButtonProps) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      disabled={disabled}
      className={[
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl font-medium',
        'transition-[background-color,border-color,filter,color] duration-150 ease-rastro',
        'disabled:cursor-not-allowed disabled:opacity-50',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? (
        <span aria-hidden className="-ml-0.5 flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
