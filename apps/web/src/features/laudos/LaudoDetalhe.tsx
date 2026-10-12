import { MESSAGES, type CpStatus, type LaudoStatus, type LaudoTipo } from '@concreto/shared';
import { useState } from 'react';

import {
  BigButton,
  LoadingButton,
  StatusPill,
  useToast,
  type StatusTone,
} from '../../components/ui';

import { ResistenciaChart } from './ResistenciaChart';
import { type LaudoDetalhe as LaudoDetalheData } from './laudos-service';

const LAUDO_TIPO_LABELS: Readonly<Record<LaudoTipo, string>> = {
  parcial_7d: 'Parcial 7 dias',
  parcial_14d: 'Parcial 14 dias',
  final_28d: 'Final (28 dias)',
};

const CP_STATUS_LABELS: Readonly<Record<CpStatus, string>> = {
  moldado: 'Moldado',
  coletado: 'Coletado',
  rompido: 'Rompido',
  descartado: 'Descartado',
  expurgado: 'Expurgado',
};

const LAUDO_STATUS: Readonly<Record<LaudoStatus, { label: string; tone: StatusTone }>> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  pronto_assinatura: { label: 'Pronto para assinatura', tone: 'accent' },
  assinado: { label: 'Assinado', tone: 'success' },
  substituido: { label: 'Substituído', tone: 'neutral' },
};

/** The partial ages a report can be emitted for on demand (US13-CA2). */
const PARTIAL_AGES = [7, 14] as const;

export interface LaudoDetalheViewProps {
  detalhe: LaudoDetalheData;
  onDefinirNumero: (numero: string) => void;
  definindoNumero: boolean;
  onMarcarPronto: () => void;
  marcandoPronto: boolean;
  onEmitirParcial: (concretagemId: string, idadeDias: number) => void;
  emitindoParcial: boolean;
  onGerarPdf: () => void;
  gerandoPdf: boolean;
  onBaixarPdf: () => void;
  baixandoPdf: boolean;
  onUploadAssinado: (pdf: File, elaborador: File | null) => void;
  enviandoAssinado: boolean;
  onCorrigir: () => void;
  corrigindo: boolean;
}

/**
 * Read-only, pre-filled view of a report (F-S007-3 + S008): client/obra + NF
 * header, per-age KGF/MPa/FCM table and the resistance curve, followed by the
 * STATUS-AWARE actions — draft (emitir parcial / marcar pronto), pronto (gerar
 * PDF, baixar, enviar assinado), assinado (baixar, corrigir). Guards and error
 * copy are enforced/rendered exactly as the SPEC prescribes.
 */
/** True while the report still carries the auto-generated "RASCUNHO …" number. */
function isNumeroPlaceholder(numero: string): boolean {
  return /^RASCUNHO/i.test(numero.trim());
}

export function LaudoDetalheView(props: LaudoDetalheViewProps) {
  const { detalhe } = props;
  const singleConcretagem = detalhe.concretagens.length === 1 ? detalhe.concretagens[0]! : null;
  // The definitive number is editable while the report is not yet published (C4).
  const podeDefinirNumero = detalhe.status === 'rascunho' || detalhe.status === 'pronto_assinatura';
  const numeroPendente = isNumeroPlaceholder(detalhe.numero);
  const idadesComResultado = new Set(
    detalhe.consolidado.idades.filter((i) => i.fcm !== null).map((i) => i.idadeAlvoDias),
  );
  const podeParcial = detalhe.tipo_laudo === 'final_28d' && singleConcretagem !== null;
  const statusInfo = LAUDO_STATUS[detalhe.status];

  const nfs = detalhe.concretagens.map((c) => c.nf_numero).join(', ') || '—';

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
          <StatusPill label={LAUDO_TIPO_LABELS[detalhe.tipo_laudo]} tone="neutral" plain />
          {detalhe.versao > 1 ? (
            <StatusPill label={`Versão ${detalhe.versao}`} tone="info" plain />
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-concreto-100 bg-white p-4 sm:grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr]">
          <Fact
            label="Obra"
            value={`${detalhe.obra_sigla ?? 'Obra'} · ${detalhe.obra_nome ?? '—'}`}
          />
          <Fact label="Cliente" value={detalhe.cliente_nome ?? 'Cliente'} />
          <Fact label="NF" value={nfs} mono />
          <Fact
            label="fck de projeto"
            value={detalhe.fckProjeto !== null ? `${detalhe.fckProjeto} MPa` : '—'}
          />
        </dl>
      </header>

      {/* Definitive laudo number (C4 / PRD §2.3): required before the PDF. */}
      {podeDefinirNumero ? (
        <NumeroEditor
          numeroAtual={numeroPendente ? '' : detalhe.numero}
          pendente={numeroPendente}
          onDefinirNumero={props.onDefinirNumero}
          definindoNumero={props.definindoNumero}
        />
      ) : null}

      {/* Per-age results (KGF/MPa/FCM). */}
      <div className="flex flex-col gap-3">
        <h3 className="eyebrow">Resultados por idade</h3>
        {detalhe.consolidado.idades.length === 0 ? (
          <p className="rounded-xl border border-dashed border-concreto-200 bg-white px-4 py-6 text-center text-concreto-500">
            Ainda não há corpos de prova para este laudo.
          </p>
        ) : (
          detalhe.consolidado.idades.map((idade) => (
            <div
              key={idade.idadeAlvoDias}
              className="overflow-hidden rounded-xl border border-concreto-100 bg-white"
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-concreto-100 px-4 py-2.5">
                <span className="font-display text-[20px] font-semibold leading-none">
                  {idade.idadeAlvoDias}
                  <span className="ml-0.5 text-[14px] font-medium text-concreto-500"> dias</span>
                </span>
                <span className="sr-only">Idade: {idade.idadeAlvoDias} dias</span>
                <span className="ml-auto">
                  {idade.expurgada ? (
                    <StatusPill label="Idade expurgada — sem resultado" tone="neutral" />
                  ) : idade.pendente ? (
                    <StatusPill label="CPs pendentes" tone="info" />
                  ) : (
                    <StatusPill label={`FCM ${idade.fcm} MPa`} tone="success" />
                  )}
                </span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-concreto-25">
                  <tr className="eyebrow">
                    <th className="px-4 py-2 font-semibold">CP</th>
                    <th className="px-4 py-2 text-right font-semibold">Carga (kgf)</th>
                    <th className="px-4 py-2 text-right font-semibold">MPa</th>
                    <th className="px-4 py-2 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-concreto-100">
                  {idade.cps.map((cp) => (
                    <tr
                      key={cp.codigoRastreio}
                      className={cp.status === 'expurgado' ? 'text-concreto-400 line-through' : ''}
                    >
                      <td className="px-4 py-2 font-mono text-[13px]">{cp.codigoRastreio}</td>
                      <td className="px-4 py-2 text-right">
                        {cp.status === 'rompido' ? (cp.cargaRupturaKgf ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-display text-[16px] font-semibold">
                        {cp.status === 'rompido' ? (cp.mpaCalculado ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-2 text-concreto-500">{CP_STATUS_LABELS[cp.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Resistance curve + fck reference line. */}
      <div className="rounded-xl border border-concreto-100 bg-white p-4">
        <h3 className="eyebrow mb-3">Curva de resistência</h3>
        <ResistenciaChart curva={detalhe.consolidado.curva} fckProjeto={detalhe.fckProjeto} />
      </div>

      {/* Status-aware actions: the next step for this report. */}
      <div className="flex flex-col gap-3 rounded-xl border border-concreto-100 bg-white p-4">
        <h3 className="eyebrow">Próxima etapa</h3>
        {detalhe.status === 'rascunho' ? (
          <RascunhoActions
            {...props}
            podeParcial={podeParcial}
            singleConcretagem={singleConcretagem}
            idadesComResultado={idadesComResultado}
          />
        ) : null}
        {detalhe.status === 'pronto_assinatura' ? <ProntoActions {...props} /> : null}
        {detalhe.status === 'assinado' ? <AssinadoActions {...props} /> : null}
        {detalhe.status === 'substituido' ? (
          <p className="text-concreto-500">Este laudo foi substituído por uma nova versão.</p>
        ) : null}
      </div>
    </section>
  );
}

/** One labelled fact of the report header. */
function Fact({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-0.5 truncate text-grafite ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Definitive-number editor (C4). While a report shows the "RASCUNHO …"
 * placeholder the PDF cannot be generated, so this block is highlighted as
 * pending; the engineer types the controlled number (N°003AGEHAB / CT001-T2-CP1)
 * and saves it through `definir_numero_laudo`.
 */
function NumeroEditor({
  numeroAtual,
  pendente,
  onDefinirNumero,
  definindoNumero,
}: {
  numeroAtual: string;
  pendente: boolean;
  onDefinirNumero: (numero: string) => void;
  definindoNumero: boolean;
}) {
  const [numero, setNumero] = useState(numeroAtual);
  const trimmed = numero.trim();
  const invalido = trimmed === '' || /^RASCUNHO/i.test(trimmed);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        pendente ? 'border-sinal-600/50 bg-sinal-50' : 'border-concreto-100 bg-white'
      }`}
    >
      <label className="flex flex-col gap-1">
        <span className="eyebrow">{MESSAGES.feature.laudoNumeroLabel}</span>
        {pendente ? (
          <span className="text-[13px] text-yellow-900">{MESSAGES.domain.NUMERO_PENDENTE}</span>
        ) : null}
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Ex.: N°003AGEHAB ou CT001-T2-CP1"
          aria-label={MESSAGES.feature.laudoNumeroLabel}
          disabled={definindoNumero}
          className="control font-mono"
        />
      </label>
      <div>
        <LoadingButton
          size="sm"
          loading={definindoNumero}
          loadingLabel={MESSAGES.feature.laudoDefinindoNumero}
          disabled={invalido}
          onClick={() => onDefinirNumero(trimmed)}
        >
          {MESSAGES.feature.laudoDefinirNumero}
        </LoadingButton>
      </div>
    </div>
  );
}

/** Draft actions: emit partial (single-NF finals) + mark ready for signature. */
function RascunhoActions({
  onMarcarPronto,
  marcandoPronto,
  onEmitirParcial,
  emitindoParcial,
  podeParcial,
  singleConcretagem,
  idadesComResultado,
}: LaudoDetalheViewProps & {
  podeParcial: boolean;
  singleConcretagem: LaudoDetalheData['concretagens'][number] | null;
  idadesComResultado: Set<number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {podeParcial && singleConcretagem
        ? PARTIAL_AGES.filter((age) => idadesComResultado.has(age)).map((age) => (
            <BigButton
              key={age}
              variant="neutral"
              disabled={emitindoParcial}
              onClick={() => onEmitirParcial(singleConcretagem.id, age)}
            >
              Emitir parcial {age}d
            </BigButton>
          ))
        : null}
      <LoadingButton
        variant="accent"
        loading={marcandoPronto}
        loadingLabel="Marcando..."
        onClick={onMarcarPronto}
      >
        Marcar pronto para assinatura
      </LoadingButton>
    </div>
  );
}

/** Pronto-assinatura actions: generate PDF, download, upload signed. */
function ProntoActions({
  detalhe,
  onGerarPdf,
  gerandoPdf,
  onBaixarPdf,
  baixandoPdf,
  onUploadAssinado,
  enviandoAssinado,
}: LaudoDetalheViewProps) {
  const temPdf = Boolean(detalhe.pdf_original_url);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <LoadingButton
          variant={temPdf ? 'neutral' : 'accent'}
          loading={gerandoPdf}
          loadingLabel={MESSAGES.feature.laudoGerandoPdf}
          onClick={onGerarPdf}
        >
          {temPdf ? 'Regerar PDF' : MESSAGES.feature.laudoGerarPdf}
        </LoadingButton>
        {temPdf ? (
          <LoadingButton
            variant="neutral"
            loading={baixandoPdf}
            loadingLabel={MESSAGES.feature.laudoBaixandoPdf}
            onClick={onBaixarPdf}
          >
            {MESSAGES.feature.laudoBaixarPdf}
          </LoadingButton>
        ) : null}
      </div>
      {temPdf ? (
        <UploadAssinadoBlock
          onUploadAssinado={onUploadAssinado}
          enviandoAssinado={enviandoAssinado}
        />
      ) : (
        <p className="text-[13px] text-concreto-500">
          Gere o PDF, assine-o no gov.br e envie o arquivo assinado para publicar o laudo.
        </p>
      )}
    </div>
  );
}

/** Assinado actions: copy public link + download the report + correct (new version). */
function AssinadoActions({
  detalhe,
  onBaixarPdf,
  baixandoPdf,
  onCorrigir,
  corrigindo,
}: LaudoDetalheViewProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {detalhe.codigo_verificacao ? (
        <CopiarLinkValidacao codigo={detalhe.codigo_verificacao} />
      ) : null}
      {detalhe.pdf_original_url ? (
        <LoadingButton
          variant="neutral"
          loading={baixandoPdf}
          loadingLabel={MESSAGES.feature.laudoBaixandoPdf}
          onClick={onBaixarPdf}
        >
          {MESSAGES.feature.laudoBaixarPdf}
        </LoadingButton>
      ) : null}
      <LoadingButton
        variant="neutral"
        loading={corrigindo}
        loadingLabel={MESSAGES.feature.laudoCorrigindo}
        onClick={onCorrigir}
      >
        {MESSAGES.feature.laudoCorrigir}
      </LoadingButton>
    </div>
  );
}

/**
 * Copies the PUBLIC validation URL for the report (QW-15), so the engineer can
 * paste it to the client/fiscal (e.g. via WhatsApp) without generating the PDF
 * and scanning its own QR. The link points at the anonymous `/validar/:codigo`
 * page, which always resolves to the current ("vigente") version.
 */
function CopiarLinkValidacao({ codigo }: { codigo: string }) {
  const { show } = useToast();
  const url = `${window.location.origin}/validar/${codigo}`;

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(url);
      show(MESSAGES.feature.laudoLinkCopiado, 'success');
    } catch {
      // Clipboard blocked (permissions/insecure context) — show the URL to copy by hand.
      show(url, 'info');
    }
  }

  return (
    <BigButton variant="neutral" onClick={handleCopiar}>
      {MESSAGES.feature.laudoCopiarLink}
    </BigButton>
  );
}

/** Signed-PDF upload block: required PDF + optional 2nd (elaborador) signature. */
function UploadAssinadoBlock({
  onUploadAssinado,
  enviandoAssinado,
}: Pick<LaudoDetalheViewProps, 'onUploadAssinado' | 'enviandoAssinado'>) {
  const [pdf, setPdf] = useState<File | null>(null);
  const [elaborador, setElaborador] = useState<File | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-concreto-200 bg-concreto-25 p-4">
      <p className="font-semibold text-grafite">Publicar laudo assinado</p>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-concreto-600">
          PDF assinado (gov.br) — obrigatório
        </span>
        <input
          type="file"
          accept="application/pdf"
          aria-label="PDF assinado"
          disabled={enviandoAssinado}
          onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
          className="text-[13px] file:mr-3 file:rounded-lg file:border file:border-concreto-200 file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-grafite hover:file:bg-concreto-25"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-concreto-600">
          {MESSAGES.feature.laudoUploadElaborador}
        </span>
        <input
          type="file"
          accept="application/pdf"
          aria-label="2ª assinatura (elaborador)"
          disabled={enviandoAssinado}
          onChange={(e) => setElaborador(e.target.files?.[0] ?? null)}
          className="text-[13px] file:mr-3 file:rounded-lg file:border file:border-concreto-200 file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-grafite hover:file:bg-concreto-25"
        />
      </label>
      <div>
        <LoadingButton
          variant="accent"
          loading={enviandoAssinado}
          loadingLabel={MESSAGES.feature.laudoEnviandoAssinado}
          disabled={pdf === null}
          onClick={() => {
            if (pdf) {
              onUploadAssinado(pdf, elaborador);
            }
          }}
        >
          {MESSAGES.feature.laudoUploadAssinado}
        </LoadingButton>
      </div>
    </div>
  );
}
