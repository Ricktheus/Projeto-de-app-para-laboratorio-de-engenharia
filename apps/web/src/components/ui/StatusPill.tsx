export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ai' | 'accent';

/** Plan §6.2 semantic status pairs (text/background ≥ 4.5:1). */
const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-concreto-50 text-concreto-600 ring-concreto-200', dot: 'bg-concreto-400' },
  info: { pill: 'bg-cobalto-50 text-cobalto-600 ring-cobalto-100', dot: 'bg-cobalto-600' },
  success: { pill: 'bg-success-soft text-success ring-success/20', dot: 'bg-success' },
  warning: { pill: 'bg-warning-soft text-warning ring-warning/20', dot: 'bg-warning' },
  danger: { pill: 'bg-danger-soft text-danger ring-danger/20', dot: 'bg-danger' },
  ai: { pill: 'bg-ia-50 text-ia-600 ring-ia-600/30', dot: 'bg-ia-600' },
  accent: {
    pill: 'bg-sinal-50 text-grafite ring-sinal-600/40',
    dot: 'bg-sinal-500 ring-1 ring-grafite',
  },
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  /** Hide the leading status dot (e.g. for plain tags). */
  plain?: boolean;
}

/**
 * Compact status badge (F-S003-3). Status is always conveyed by text plus a dot,
 * never by colour alone (plan §6.2).
 */
export function StatusPill({ label, tone = 'neutral', plain = false }: StatusPillProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset',
        t.pill,
      ].join(' ')}
    >
      {plain ? null : <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {label}
    </span>
  );
}
