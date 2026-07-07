import { MESSAGES } from '@concreto/shared';
import { type ReactNode } from 'react';

import { BigButton } from '../../components/ui';

export interface DashboardCardProps {
  title: string;
  /** Query is loading (first fetch). */
  isLoading: boolean;
  /** Query failed. */
  isError: boolean;
  /** Retry callback for the error state. */
  onRetry: () => void;
  /** Data loaded but empty — shows `emptyText` instead of `children`. */
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}

/**
 * Shared shell for every operational-dashboard card (F-S010-1). Encapsulates the
 * four required UI-states — Loading (skeleton), Error (exact copy + retry), Empty
 * (message) and Success (children) — so each card handles them identically and
 * one card's failure never blanks the rest of the board.
 */
export function DashboardCard({
  title,
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyText,
  children,
}: DashboardCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-field font-semibold text-gray-800">{title}</h2>

      {isLoading ? (
        <div
          className="flex items-center gap-3 text-gray-400"
          role="status"
          aria-label="Carregando"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 text-field text-danger">
          <span>{MESSAGES.feature.dashboardErroCard}</span>
          <BigButton variant="neutral" onClick={onRetry}>
            {MESSAGES.feature.dashboardTentarNovamente}
          </BigButton>
        </div>
      ) : isEmpty ? (
        <p className="text-gray-500">{emptyText}</p>
      ) : (
        children
      )}
    </section>
  );
}
