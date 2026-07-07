import { formatIsoDateBr, MESSAGES, type PeriodCount } from '@concreto/shared';
import { Link } from 'react-router-dom';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';

import { DashboardCard } from './DashboardCard';
import {
  useConcretagensSemColeta,
  useCpCounters,
  useLaudosPendentes,
  useProximosRompimentos,
} from './useDashboard';

/** A today/week pair of numbers for one specimen stage. */
function StageCounter({ label, count }: { label: string; count: PeriodCount }) {
  return (
    <div className="flex flex-col rounded-xl bg-gray-50 p-3">
      <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-gray-900">{count.hoje}</span>
      <span className="text-sm text-gray-500">
        {MESSAGES.feature.dashboardSemana}: <span className="tabular-nums">{count.semana}</span>
      </span>
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
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={isEmpty}
      emptyText={MESSAGES.feature.dashboardEmptyCps}
    >
      {data ? (
        <div className="grid grid-cols-3 gap-2">
          <StageCounter label={MESSAGES.feature.dashboardCpsMoldados} count={data.moldados} />
          <StageCounter label={MESSAGES.feature.dashboardCpsColetados} count={data.coletados} />
          <StageCounter label={MESSAGES.feature.dashboardCpsRompidos} count={data.rompidos} />
        </div>
      ) : null}
    </DashboardCard>
  );
}

/** Card 2 — reports waiting for the RT's signature. */
function LaudosPendentesCard() {
  const { data, isLoading, isError, refetch } = useLaudosPendentes();

  return (
    <DashboardCard
      title={MESSAGES.feature.dashboardLaudosPendentesTitulo}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={!!data && data.length === 0}
      emptyText={MESSAGES.feature.dashboardEmptyLaudosPendentes}
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-3xl font-bold tabular-nums text-gray-900">{data.length}</span>
          <ul className="flex flex-col gap-1">
            {data.slice(0, 5).map((laudo) => (
              <li key={laudo.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-gray-800">{laudo.numero}</span>
                <span className="truncate text-gray-500">
                  {laudo.obraSigla ?? laudo.obraNome ?? '—'}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/laudos" className="text-sm font-medium text-brand hover:underline">
            Ver laudos →
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
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={!!data && data.length === 0}
      emptyText={MESSAGES.feature.dashboardEmptyConcretagensSemColeta}
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-3xl font-bold tabular-nums text-danger">{data.length}</span>
          <ul className="flex flex-col gap-1">
            {data.slice(0, 5).map((c) => (
              <li
                key={c.concretagemId}
                className="flex items-baseline justify-between gap-2 text-sm"
              >
                <span className="truncate font-medium text-gray-800">{c.obraSigla ?? '—'}</span>
                <span className="truncate text-gray-500">NF {c.nfNumero ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DashboardCard>
  );
}

/** Card 4 — collected specimens scheduled for an upcoming rupture. */
function ProximosRompimentosCard() {
  const { data, isLoading, isError, refetch } = useProximosRompimentos();

  return (
    <DashboardCard
      title={MESSAGES.feature.dashboardProximosRompimentosTitulo}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={!!data && data.length === 0}
      emptyText={MESSAGES.feature.dashboardEmptyProximosRompimentos}
    >
      {data && data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.map((cp) => (
            <li
              key={cp.codigoRastreio}
              className="flex items-baseline justify-between gap-2 text-sm"
            >
              <span className="truncate font-medium text-gray-800">{cp.codigoRastreio}</span>
              <span className="whitespace-nowrap text-gray-500">
                {cp.obraSigla ? `${cp.obraSigla} · ` : ''}
                {formatIsoDateBr(cp.dataRupturaPlanejada)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </DashboardCard>
  );
}

/**
 * Operational dashboard — the office engineers' web home (F-S010-1). Four
 * independent cards give the shift's operational snapshot: specimen throughput
 * (today/week), reports awaiting signature, concretagens overdue for collection,
 * and the next scheduled ruptures. Each card handles Loading/Error/Empty on its
 * own so a single failing indicator never blanks the board.
 */
export function DashboardPage() {
  return (
    <AppShell title={MESSAGES.feature.dashboardTitulo}>
      <ManagementNav />
      <div className="grid gap-4 md:grid-cols-2">
        <CpCountersCard />
        <LaudosPendentesCard />
        <ConcretagensSemColetaCard />
        <ProximosRompimentosCard />
      </div>
    </AppShell>
  );
}
