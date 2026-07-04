import { type ReactNode } from 'react';

export interface EmptyStateProps {
  /** Emoji or icon node shown above the message. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Call-to-action rendered below the text (SPEC §3.0 requires a CTA). */
  action?: ReactNode;
}

/**
 * Empty UI-state (SPEC §3.0): icon + text + CTA. Reused by every list screen so
 * an empty collection always offers the user a next step (F-S003-3).
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-10 text-center">
      {icon ? (
        <div aria-hidden className="text-4xl">
          {icon}
        </div>
      ) : null}
      <h2 className="text-field font-semibold text-gray-800">{title}</h2>
      {description ? <p className="max-w-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
