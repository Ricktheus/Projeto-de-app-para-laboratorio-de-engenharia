import { type ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  /** Small text next to the title (counts, period). */
  meta?: ReactNode;
  /** Right-aligned header content (links, actions). */
  actions?: ReactNode;
  /** Leading icon in the header. */
  icon?: ReactNode;
  /** Highlights the card as requiring action (signal-yellow rail). */
  attention?: 'accent' | 'danger';
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

const RAIL: Record<NonNullable<CardProps['attention']>, string> = {
  accent: 'before:bg-sinal-500',
  danger: 'before:bg-danger',
};

/** Content surface with an optional header (plan §6.5: 1px border, subtle shadow). */
export function Card({
  title,
  meta,
  actions,
  icon,
  attention,
  className = '',
  bodyClassName = 'p-5',
  children,
}: CardProps) {
  return (
    <section
      className={[
        'surface relative flex flex-col overflow-hidden',
        attention
          ? `before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${RAIL[attention]}`
          : '',
        className,
      ].join(' ')}
    >
      {title || actions ? (
        <header className="flex items-center gap-2 border-b border-concreto-100 px-5 py-3">
          {icon ? (
            <span aria-hidden className="flex text-concreto-500">
              {icon}
            </span>
          ) : null}
          {title ? <h2 className="text-[14px] font-semibold text-ink">{title}</h2> : null}
          {meta ? <span className="text-[13px] text-concreto-500">{meta}</span> : null}
          {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={['flex-1', bodyClassName].join(' ')}>{children}</div>
    </section>
  );
}
