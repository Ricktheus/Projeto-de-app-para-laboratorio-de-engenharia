import { MESSAGES, type LaudoTipo } from '@concreto/shared';
import {
  ArrowsClockwise,
  Buildings,
  CalendarBlank,
  DownloadSimple,
  FilePdf,
  FileText,
  SealCheck,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import {
  BigButton,
  EmptyState,
  ErrorState,
  KpiTile,
  LoadingButton,
  SkeletonRows,
  StatusPill,
  useToast,
} from '../../components/ui';

import { type PortalLaudoRow } from './portal-service';
import { usePortalLaudos, useBaixarLaudoAssinado } from './usePortal';

const LAUDO_TIPO_LABELS: Readonly<Record<LaudoTipo, string>> = {
  parcial_7d: 'Parcial 7 dias',
  parcial_14d: 'Parcial 14 dias',
  final_28d: 'Final (28 dias)',
};

/** Distinct obras present in the report list, for the obra filter (US18-CA2). */
function obraOptions(laudos: PortalLaudoRow[]): { id: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const laudo of laudos) {
    if (!byId.has(laudo.obra_id)) {
      byId.set(laudo.obra_id, laudo.obra_sigla ?? laudo.obra_nome ?? 'Obra');
    }
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label }));
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

/**
 * Client portal (F-S009-1 / US18). Summary + reports grouped by obra; lists ONLY the client's signed reports
 * (enforced by RLS), filterable by obra, each downloadable as its signed PDF.
 * Loading (skeleton), Error (retry) and Empty (SPEC copy) states are all handled.
 */
export function PortalPage() {
  const { show } = useToast();
  const { data: laudos, isLoading, isError, refetch } = usePortalLaudos();
  const baixar = useBaixarLaudoAssinado();
  const [obraFilter, setObraFilter] = useState('');
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const lista = useMemo(() => laudos ?? [], [laudos]);
  const options = useMemo(() => obraOptions(lista), [lista]);
  const filtered = useMemo(
    () => lista.filter((laudo) => obraFilter === '' || laudo.obra_id === obraFilter),
    [lista, obraFilter],
  );

  async function handleBaixar(laudoId: string) {
    setBaixandoId(laudoId);
    try {
      const url = await baixar.mutateAsync(laudoId);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    } finally {
      setBaixandoId(null);
    }
  }

  const ultimo = useMemo(
    () =>
      lista.reduce<PortalLaudoRow | null>(
        (best, l) => (!best || (l.data_emissao ?? '') > (best.data_emissao ?? '') ? l : best),
        null,
      ),
    [lista],
  );

  // Group the (filtered) reports by obra, newest first inside each group.
  const grupos = useMemo(() => {
    const map = new Map<string, { label: string; nome: string | null; laudos: PortalLaudoRow[] }>();
    for (const laudo of filtered) {
      const g = map.get(laudo.obra_id) ?? {
        label: laudo.obra_sigla ?? laudo.obra_nome ?? 'Obra',
        nome: laudo.obra_sigla ? laudo.obra_nome : null,
        laudos: [],
      };
      g.laudos.push(laudo);
      map.set(laudo.obra_id, g);
    }
    for (const g of map.values()) {
      g.laudos.sort((a, b) => (b.data_emissao ?? '').localeCompare(a.data_emissao ?? ''));
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <AppShell
      title="Seus laudos"
      subtitle="Laudos de resistência à compressão assinados pelo responsável técnico, com verificação pública de autenticidade."
      eyebrow="Portal do Cliente"
    >
      {isLoading ? (
        <SkeletonRows rows={3} className="h-20" />
      ) : isError ? (
        <ErrorState
          message={MESSAGES.http.serverError}
          action={
            <BigButton variant="neutral" size="sm" onClick={() => void refetch()}>
              {MESSAGES.feature.painelTentarNovamente}
            </BigButton>
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title={MESSAGES.feature.emptyPortalLaudos}
          action={
            <BigButton
              variant="neutral"
              icon={<ArrowsClockwise size={16} />}
              onClick={() => void refetch()}
            >
              Atualizar
            </BigButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile
              label="Laudos disponíveis"
              value={lista.length}
              icon={<FileText size={14} weight="bold" />}
            />
            <KpiTile
              label="Obras"
              value={options.length}
              icon={<Buildings size={14} weight="bold" />}
            />
            <KpiTile
              label="Último emitido"
              value={
                <span className="text-[28px]">{formatDate(ultimo?.data_emissao ?? null)}</span>
              }
              icon={<CalendarBlank size={14} weight="bold" />}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-full max-w-xs flex-col gap-1">
              <span className="text-[13px] font-medium text-concreto-600">Obra</span>
              <select
                value={obraFilter}
                onChange={(e) => setObraFilter(e.target.value)}
                className="control"
              >
                <option value="">{MESSAGES.feature.portalTodasObras}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {grupos.map(([obraId, grupo]) => (
            <section key={obraId} className="flex flex-col gap-3">
              <header className="flex items-baseline gap-2">
                <Buildings size={18} className="self-center text-concreto-400" aria-hidden />
                <h2 className="font-display text-[20px] font-semibold">{grupo.label}</h2>
                {grupo.nome ? <span className="text-concreto-500">{grupo.nome}</span> : null}
                <span className="ml-auto text-[13px] text-concreto-500">
                  {grupo.laudos.length} {grupo.laudos.length === 1 ? 'laudo' : 'laudos'}
                </span>
              </header>
              <ul className="grid gap-3 md:grid-cols-2">
                {grupo.laudos.map((laudo) => (
                  <li key={laudo.id} className="surface flex flex-col gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-grafite text-sinal-500"
                      >
                        <FilePdf size={20} weight="bold" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[14px] font-medium text-grafite">
                          {laudo.numero}
                        </p>
                        <p className="text-[13px] text-concreto-500">
                          Emitido em {formatDate(laudo.data_emissao)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusPill
                          label={LAUDO_TIPO_LABELS[laudo.tipo_laudo]}
                          tone="neutral"
                          plain
                        />
                        {laudo.versao > 1 ? (
                          <StatusPill label={`Versão ${laudo.versao}`} tone="info" plain />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-concreto-100 pt-4">
                      <LoadingButton
                        size="sm"
                        icon={<DownloadSimple size={15} weight="bold" />}
                        loading={baixandoId === laudo.id}
                        loadingLabel={MESSAGES.feature.laudoBaixandoPdf}
                        onClick={() => handleBaixar(laudo.id)}
                      >
                        {MESSAGES.feature.portalBaixarLaudo}
                      </LoadingButton>
                      {laudo.codigo_verificacao ? (
                        <a
                          href={`/validar/${laudo.codigo_verificacao}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-cobalto-600 hover:bg-cobalto-50"
                        >
                          <SealCheck size={15} weight="bold" aria-hidden />
                          {MESSAGES.feature.portalValidarAutenticidade}
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
