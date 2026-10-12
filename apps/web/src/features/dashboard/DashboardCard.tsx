import { MESSAGES } from '@concreto/shared';
import { type ReactNode } from 'react';

import { BigButton, Card, ErrorState, Skeleton } from '../../components/ui';

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
  /** Header icon. */
  icon?: ReactNode;
  /** Header meta (e.g. a count). */
  meta?: ReactNode;
  /** Right-aligned header content. */
  actions?: ReactNode;
  /** Attention rail when the card holds work to do now. */
  attention?: 'accent' | 'danger';
  className?: string;
  children: ReactNode;
}

/**
 * Shared shell for every cockpit card (F-S010-1). Encapsulates the four required
 * UI-states — Loading (skeleton), Error (exact copy + retry), Empty (message) and
 * Success (children) — so one card's failure never blanks the rest of the board.
 */
export function DashboardCard({
  title,
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyText,
  icon,
  meta,
  actions,
  attention,
  className,
  children,
}: DashboardCardProps) {
  const ready = !isLoading && !isError && !isEmpty;
  return (
    <Card
      title={title}
      icon={icon}
      meta={ready ? meta : undefined}
      actions={ready ? actions : undefined}
      attention={ready ? attention : undefined}
      className={className}
    >
      {isLoading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Carregando">
          <Skeleton className="h-9" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-9 w-3/5" />
        </div>
      ) : isError ? (
        <ErrorState
          message={MESSAGES.feature.dashboardErroCard}
          action={
            <BigButton variant="neutral" size="sm" onClick={onRetry}>
              {MESSAGES.feature.dashboardTentarNovamente}
            </BigButton>
          }
        />
      ) : isEmpty ? (
        <p className="flex items-center gap-2 py-3 text-concreto-500">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
          {emptyText}
        </p>
      ) : (
        children
      )}
    </Card>
  );
}
