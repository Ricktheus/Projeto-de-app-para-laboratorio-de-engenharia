import { type ReactNode } from 'react';

export interface EmptyStateProps {
  /** Icon node (Phosphor) shown above the message. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Call-to-action rendered below the text (SPEC §3.0 requires a CTA). */
  action?: ReactNode;
  /** Compact variant for use inside cards. */
  compact?: boolean;
}

/**
 * Empty UI-state (SPEC §3.0): technical monochrome icon + text + CTA (plan §6.6:
 * no emoji, no clip-art).
 */
export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-2 text-center',
        compact
          ? 'py-6'
          : 'rounded-xl border border-dashed border-concreto-200 bg-white/70 px-6 py-14',
      ].join(' ')}
    >
      {icon ? (
        <div
          aria-hidden
          className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-concreto-100 bg-concreto-25 text-concreto-400"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-field font-semibold text-grafite">{title}</h2>
      {description ? <p className="max-w-sm text-concreto-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
