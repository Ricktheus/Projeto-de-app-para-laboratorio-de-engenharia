import { WarningCircle } from '@phosphor-icons/react';
import { type ReactNode } from 'react';

/** Inline error UI-state: message + optional retry action. */
export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-field text-danger"
    >
      <span className="flex items-center gap-2 font-medium">
        <WarningCircle size={18} weight="bold" aria-hidden />
        {message}
      </span>
      {action}
    </div>
  );
}
