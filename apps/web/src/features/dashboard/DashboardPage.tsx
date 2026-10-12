import { formatIsoDateBr, MESSAGES, type PeriodCount } from '@concreto/shared';
import { Link } from 'react-router-dom';

import { AppShell } from '../../components/AppShell';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Cylinder,
  Flask,
  Hammer,
  PenNib,
  Truck,
} from '../../components/icons';
import { KpiTile, StatusPill } from '../../components/ui';

import { DashboardCard } from './DashboardCard';
import { type ProximoRompimentoRow } from './dashboard-service';
import {
  useConcretagensSemColeta,
  useCpCounters,
  useLaudosPendentes,
  useProximosRompimentos,
} from './useDashboard';

/** Stage flow bar: the week's molded → collected → ruptured volume at a glance. */
function StageFlow({ counts }: { counts: [PeriodCount, PeriodCount, PeriodCount] }) {
  const max = Math.max(1, ...counts.map((c) => c.semana));
  const colors = ['bg-terra', 'bg-agua', 'bg-concreto-600'];
  const labels = ['Moldados', 'Coletados', 'Rompidos'];
  return (
    <div className="mt-4 flex flex-col gap-2" aria-hidden>
      {counts.map((c, i) => (
        <div key={labels[i]} className="flex items-center gap-3">
          <span className="w-20 text-[12px] text-concreto-500">{labels[i]}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-concreto-50">
            <div
              className={`h-full rounded-full ${colors[i]} transition-[width] duration-300 ease-rastro`}
              style={{ width: `${(c.semana / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Card 1 — CPs molded/collected/ruptured, today and this week. */
function CpCountersCard() {
  const { data, isLoading, isError, refetch } = useCpCounters();
  const isEmpty =
    !!data &&
    data.moldados.semana === 0 &&
    data.coletados.semana === 0 &&
    data.rompidos.semana === 0;

  return (
    <DashboardCard
      title={MESSAGES.feature.dashboardCpsTitulo}
      icon={<Cylinder size={18} />}
      meta="hoje · semana"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={isEmpty}
      emptyText={MESSAGES.feature.dashboardEmptyCps}
      className="xl:col-span-2"
    >
      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile
              label={MESSAGES.feature.dashboardCpsMoldados}
              icon={<Flask size={14} weight="bold" />}
              value={data.moldados.hoje}
              hint={`${MESSAGES.feature.dashboardSemana}: ${data.moldados.semana}`}
            />
            <KpiTile
              label={MESSAGES.feature.dashboardCpsColetados}
              icon={<Truck size={14} weight="bold" />}
              value={data.coletados.hoje}
              hint={`${MESSAGES.feature.dashboardSemana}: ${data.coletados.semana}`}
            />
            <KpiTile
              label={MESSAGES.feature.dashboardCpsRompidos}
              icon={<Hammer size={14} weight="bold" />}
              value={data.rompidos.hoje}
              hint={`${MESSAGES.feature.dashboardSemana}: ${data.rompidos.semana}`}
            />
          </div>
          <StageFlow counts={[data.moldados, data.coletados, data.rompidos]} />
        </>
      ) : null}
    </DashboardCard>
  );
}

/** Card 2 — reports waiting for the RT's signature: the RT's "act now" queue. */
function LaudosPendentesCard() {
  const { data, isLoading, isError, refetch } = useLaudosPendentes();

  return (
    <DashboardCard
      title={MESSAGES.feature.dashboardLaudosPendentesTitulo}
      icon={<PenNib size={18} />}
      attention="accent"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={!!data && data.length === 0}
      emptyText={MESSAGES.feature.dashboardEmptyLaudosPendentes}
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-kpi font-semibold tabular-nums">{data.length}</span>
            <span className="text-concreto-500">
              {data.length === 1 ? 'laudo na fila' : 'laudos na fila'}
            </span>
          </div>
          <ul className="divide-y divide-concreto-100 rounded-xl border border-concreto-100">
            {data.slice(0, 5).map((laudo) => (
              <li key={laudo.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="font-mono text-[13px] font-medium text-ink">{laudo.numero}</span>
                <span className="ml-auto truncate text-[13px] text-concreto-500">
                  {laudo.obraSigla ?? laudo.obraNome ?? '—'}
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/laudos"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sinal-500 px-4 font-medium text-grafite shadow-card ring-1 ring-inset ring-sinal-600 transition-colors hover:bg-sinal-600"
          >
            Ver laudos
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      ) : null}
    </DashboardCard>
  );
}

/** Card 3 — concretagens with specimens uncollected for more than 24h. */
function ConcretagensSemColetaCard() {
  const { data, isLoading, isError, refetch } = useConcretagensSemColeta();

  return (
    <DashboardCard
      title={MESSAGES.feature.dashboardConcretagensSemColetaTitulo}
      icon={<Clock size={18} />}
      attention="danger"
      meta={
        data && data.length > 0 ? (
          <StatusPill
            tone="danger"
            label={`${data.length} atrasada${data.length === 1 ? '' : 's'}`}
          />
        ) : undefined
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={!!data && data.length === 0}
      emptyText={MESSAGES.feature.dashboardEmptyConcretagensSemColeta}
    >
      {data && data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.slice(0, 6).map((c) => (
            <li
              key={c.concretagemId}
              className="flex items-center gap-3 rounded-xl border border-danger/15 bg-danger-soft/50 px-3 py-2.5"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-danger ring-offset-2 ring-offset-danger-soft"
              />
              <span className="font-medium text-ink">{c.obraSigla ?? '—'}</span>
              <span className="ml-auto font-mono text-[13px] text-concreto-600">
                NF {c.nfNumero ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </DashboardCard>
  );
}

/** Groups the upcoming ruptures by planned date for the agenda timeline. */
function groupByDate(rows: readonly ProximoRompimentoRow[]) {
  const map = new Map<string, ProximoRompimentoRow[]>();
  for (const row of rows) {
    const list = map.get(row.dataRupturaPlanejada) ?? [];
    list.push(row);
    map.set(row.dataRupturaPlanejada, list);
  }
  return [...map.entries()];
}

/** Card 4 — collected specimens scheduled for an upcoming rupture (agenda). */
function ProximosRompimentosCard() {
  const { data, isLoading, isError, refetch } = useProximosRompimentos();

  return (
    <DashboardCard
      title={MESSAGES.feature.dashboardProximosRompimentosTitulo}
      icon={<CalendarCheck size={18} />}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={!!data && data.length === 0}
      emptyText={MESSAGES.feature.dashboardEmptyProximosRompimentos}
      className="xl:row-span-2"
    >
      {data && data.length > 0 ? (
        <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-concreto-200">
          {groupByDate(data).map(([date, cps]) => (
            <li key={date} className="relative pl-6">
              <span
                aria-hidden
                className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-surface bg-agua ring-1 ring-agua"
              />
              <p className="eyebrow mb-1.5">{formatIsoDateBr(date)}</p>
              <ul className="flex flex-col gap-1.5">
                {cps.map((cp) => (
                  <li
                    key={cp.codigoRastreio}
                    className="flex items-center gap-3 rounded-lg bg-concreto-25 px-3 py-2"
                  >
                    <span className="font-mono text-[13px] font-medium text-ink">
                      {cp.codigoRastreio}
                    </span>
                    <span className="ml-auto text-[13px] text-concreto-500">
                      {cp.obraSigla ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}
    </DashboardCard>
  );
}

/**
 * "Hoje" — the operational cockpit and the office engineers' web home
 * (F-S010-1, redesigned per plan §5). Work that needs someone now (overdue
 * collections, signature queue) sits first with an attention rail; throughput
 * and the rupture agenda follow. Each card owns its Loading/Error/Empty state.
 */
export function DashboardPage() {
  return (
    <AppShell
      title="Hoje"
      subtitle="O que precisa de atenção agora e o andamento dos corpos de prova."
    >
      <div className="grid gap-5 xl:grid-cols-3">
        <ConcretagensSemColetaCard />
        <LaudosPendentesCard />
        <ProximosRompimentosCard />
        <CpCountersCard />
      </div>
    </AppShell>
  );
}
