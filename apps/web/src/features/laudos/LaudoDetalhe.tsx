import { MESSAGES, type CpStatus, type LaudoStatus, type LaudoTipo } from '@concreto/shared';
import { useState } from 'react';

import { BigButton, LoadingButton, StatusPill } from '../../components/ui';

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

const LAUDO_STATUS: Readonly<
  Record<LaudoStatus, { label: string; tone: 'info' | 'warning' | 'success' | 'danger' }>
> = {
  rascunho: { label: 'Rascunho', tone: 'warning' },
  pronto_assinatura: { label: 'Pronto para assinatura', tone: 'info' },
  assinado: { label: 'Assinado', tone: 'success' },
  substituido: { label: 'Substituído', tone: 'danger' },
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

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{detalhe.numero}</h2>
          <StatusPill label={LAUDO_TIPO_LABELS[detalhe.tipo_laudo]} tone="info" />
          <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
          {detalhe.versao > 1 ? (
            <StatusPill label={`Versão ${detalhe.versao}`} tone="info" />
          ) : null}
        </div>
        <p className="text-field text-gray-700">
          {detalhe.obra_sigla ?? 'Obra'} · {detalhe.obra_nome ?? '—'}
        </p>
        <p className="text-sm text-gray-500">
          {detalhe.cliente_nome ?? 'Cliente'} · NF{' '}
          {detalhe.concretagens.map((c) => c.nf_numero).join(', ') || '—'}
        </p>
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
      <div className="flex flex-col gap-4">
        {detalhe.consolidado.idades.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não há corpos de prova para este laudo.</p>
        ) : (
          detalhe.consolidado.idades.map((idade) => (
            <div key={idade.idadeAlvoDias} className="rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                <span className="text-field font-semibold text-gray-800">
                  Idade: {idade.idadeAlvoDias} dias
                </span>
                {idade.expurgada ? (
                  <StatusPill label="Idade expurgada — sem resultado" tone="danger" />
                ) : idade.pendente ? (
                  <StatusPill label="CPs pendentes" tone="warning" />
                ) : (
                  <StatusPill label={`FCM ${idade.fcm} MPa`} tone="success" />
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2 font-medium">CP</th>
                      <th className="px-4 py-2 font-medium">KGF</th>
                      <th className="px-4 py-2 font-medium">MPa</th>
                      <th className="px-4 py-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {idade.cps.map((cp) => (
                      <tr key={cp.codigoRastreio} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{cp.codigoRastreio}</td>
                        <td className="px-4 py-2 text-gray-900">
                          {cp.status === 'rompido' ? (cp.cargaRupturaKgf ?? '—') : '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {cp.status === 'rompido' ? (cp.mpaCalculado ?? '—') : '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{CP_STATUS_LABELS[cp.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resistance curve + fck reference line. */}
      <div>
        <h3 className="mb-2 text-field font-semibold text-gray-800">Curva de resistência</h3>
        <ResistenciaChart curva={detalhe.consolidado.curva} fckProjeto={detalhe.fckProjeto} />
      </div>

      {/* Status-aware actions. */}
      <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
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
      </div>
    </section>
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
      className={`flex flex-col gap-2 rounded-xl border p-4 ${
        pendente ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <label className="flex flex-col gap-1">
        <span className="text-field font-semibold text-gray-800">
          {MESSAGES.feature.laudoNumeroLabel}
        </span>
        {pendente ? (
          <span className="text-sm text-amber-700">{MESSAGES.domain.NUMERO_PENDENTE}</span>
        ) : null}
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Ex.: N°003AGEHAB ou CT001-T2-CP1"
          aria-label={MESSAGES.feature.laudoNumeroLabel}
          disabled={definindoNumero}
          className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
        />
      </label>
      <div>
        <LoadingButton
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
      <LoadingButton loading={marcandoPronto} loadingLabel="Marcando..." onClick={onMarcarPronto}>
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
        <p className="text-sm text-gray-500">
          Gere o PDF, assine-o no gov.br e envie o arquivo assinado para publicar o laudo.
        </p>
      )}
    </div>
  );
}

/** Assinado actions: download the report + correct (new version). */
function AssinadoActions({
  detalhe,
  onBaixarPdf,
  baixandoPdf,
  onCorrigir,
  corrigindo,
}: LaudoDetalheViewProps) {
  return (
    <div className="flex flex-wrap gap-2">
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
        loading={corrigindo}
        loadingLabel={MESSAGES.feature.laudoCorrigindo}
        onClick={onCorrigir}
      >
        {MESSAGES.feature.laudoCorrigir}
      </LoadingButton>
    </div>
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
    <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4">
      <p className="text-field font-semibold text-gray-800">Publicar laudo assinado</p>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          PDF assinado (gov.br) — obrigatório
        </span>
        <input
          type="file"
          accept="application/pdf"
          aria-label="PDF assinado"
          disabled={enviandoAssinado}
          onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          {MESSAGES.feature.laudoUploadElaborador}
        </span>
        <input
          type="file"
          accept="application/pdf"
          aria-label="2ª assinatura (elaborador)"
          disabled={enviandoAssinado}
          onChange={(e) => setElaborador(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      <div>
        <LoadingButton
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
