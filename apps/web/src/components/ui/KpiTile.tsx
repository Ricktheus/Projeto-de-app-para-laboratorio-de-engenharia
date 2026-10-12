import { type ReactNode } from 'react';

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  /** Secondary line under the value (e.g. week total). */
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
}

const VALUE_TONE: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default: 'text-ink',
  danger: 'text-danger',
  accent: 'text-ink',
};

/** Big-number indicator in Barlow (plan §6.4: KPI 40px, tabular figures). */
export function KpiTile({ label, value, hint, icon, tone = 'default' }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-concreto-100 bg-concreto-25 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {icon ? (
          <span aria-hidden className="flex text-concreto-400">
            {icon}
          </span>
        ) : null}
        <span className="eyebrow">{label}</span>
      </div>
      <span className={`font-display text-kpi font-semibold tabular-nums ${VALUE_TONE[tone]}`}>
        {value}
      </span>
      {hint ? <span className="text-[13px] text-concreto-500">{hint}</span> : null}
    </div>
  );
}
