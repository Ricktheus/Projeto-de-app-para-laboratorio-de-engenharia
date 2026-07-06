/**
 * Composes the locked report PDF (F-S008-1, PRD §11) with `@cantoo/pdf-lib`:
 * header, client/obra meta, the DATA|QUADRA|LOTE|NF|LACRE|CP|KGF|MPa|FCM table
 * per NF, the resistance chart (rasterized elsewhere) with its axis/fck labels,
 * the considerações finais, the signature blocks and the footer QR. Finally it
 * applies the permission lock `ReadOnly=true, AllowPrinting=true, AllowCopy=false`
 * (SPEC §5.3 / §6.2) and returns the encrypted bytes.
 *
 * The numbers, caveats and chart geometry all come from `packages/shared`; this
 * module is pure layout.
 */
import type { ChartGeometry, LaudoReport } from '@concreto/shared';
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib';

/** Everything the composer needs beyond the domain report model. */
export interface PdfComposeInput {
  report: LaudoReport;
  chartPng: Uint8Array;
  chartGeometry: ChartGeometry;
  qrPng: Uint8Array;
  codigoVerificacao: string;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const BLUE = rgb(0.11, 0.31, 0.85);
const RED = rgb(0.86, 0.15, 0.15);
const GRAY = rgb(0.29, 0.33, 0.39);
const LIGHT = rgb(0.9, 0.91, 0.93);
const BLACK = rgb(0.1, 0.1, 0.1);

const LEGAL_FOOTER =
  'Documento de reprodução restrita. A autenticidade pode ser verificada na página ' +
  'pública apontada pelo QR Code. Válido apenas com assinatura digital da Responsável Técnica.';

/** A tiny top-down layout cursor over one or more pages. */
class Layout {
  page: ReturnType<PDFDocument['addPage']>;
  y: number;
  constructor(
    private doc: PDFDocument,
    private font: Awaited<ReturnType<PDFDocument['embedFont']>>,
    private bold: Awaited<ReturnType<PDFDocument['embedFont']>>,
  ) {
    this.page = doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }

  /** Ensures `h` points of vertical space remain, adding a page otherwise. */
  ensure(h: number): void {
    if (this.y - h < MARGIN) {
      this.page = this.doc.addPage([A4.width, A4.height]);
      this.y = A4.height - MARGIN;
    }
  }

  text(
    value: string,
    options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
  ): void {
    const size = options.size ?? 10;
    this.ensure(size + 4);
    this.y -= size;
    this.page.drawText(value, {
      x: options.x ?? MARGIN,
      y: this.y,
      size,
      font: options.bold ? this.bold : this.font,
      color: options.color ?? BLACK,
    });
    this.y -= 4;
  }

  gap(h: number): void {
    this.y -= h;
  }
}

/** Wraps a paragraph to `maxWidth`, returning the display lines. */
function wrap(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

/** Builds the locked report PDF bytes. */
export async function composeLaudoPdf(input: PdfComposeInput): Promise<Uint8Array> {
  const { report, chartPng, chartGeometry, qrPng, codigoVerificacao } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Laudo ${report.header.numero}`);
  doc.setProducer('Laboratório de Controle Tecnológico de Concreto');

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const layout = new Layout(doc, font, bold);
  const contentWidth = A4.width - MARGIN * 2;

  // ---------- Header (logo placeholder + title + normative ref) ----------
  layout.text('RESULTADO DOS ENSAIOS LABORATORIAIS', { size: 14, bold: true, color: BLUE });
  layout.text('ENSAIO DE RESISTÊNCIA À COMPRESSÃO', { size: 12, bold: true, color: BLUE });
  layout.text(`Relatório de ensaios — ${report.header.numero}`, { size: 10, color: GRAY });
  layout.text('ABNT NBR 5739 — Concreto — Ensaio de compressão de corpos de prova cilíndricos', {
    size: 8,
    color: GRAY,
  });
  layout.gap(8);

  // ---------- Client / test meta ----------
  const meta: [string, string][] = [
    ['Cliente', report.header.clienteNome],
    ['Obra', `${report.header.obraSigla} — ${report.header.obraNome}`],
    ['Endereço', report.header.obraEndereco],
    ['Contato', report.header.obraContato],
    ['FCK de projeto', report.header.fckProjeto !== null ? `${report.header.fckProjeto} MPa` : '—'],
    ['Slump', report.header.slump],
    ['Medida do CP', report.header.medidaCp],
    ['Nº de CPs', String(report.header.numCps)],
  ];
  for (const [label, value] of meta) {
    layout.ensure(14);
    layout.y -= 11;
    layout.page.drawText(`${label}:`, { x: MARGIN, y: layout.y, size: 9, font: bold, color: GRAY });
    layout.page.drawText(value, { x: MARGIN + 90, y: layout.y, size: 9, font, color: BLACK });
    layout.y -= 3;
  }
  layout.gap(10);

  // ---------- Results table, one block per NF ----------
  layout.text('Resultados dos ensaios', { size: 11, bold: true });
  for (const bloco of report.blocos) {
    layout.gap(4);
    layout.text(
      `DATA ${bloco.dataConcretagem}  ·  QUADRA ${bloco.quadra}  ·  LOTE ${bloco.lote}  ·  ` +
        `NF ${bloco.nfNumero}  ·  LACRE ${bloco.lacre}`,
      { size: 8, bold: true, color: GRAY },
    );
    // Column header.
    layout.ensure(14);
    layout.y -= 11;
    const cols = {
      cp: MARGIN,
      idade: MARGIN + 150,
      kgf: MARGIN + 240,
      mpa: MARGIN + 330,
      fcm: MARGIN + 420,
    };
    layout.page.drawText('CP', { x: cols.cp, y: layout.y, size: 8, font: bold, color: GRAY });
    layout.page.drawText('IDADE', { x: cols.idade, y: layout.y, size: 8, font: bold, color: GRAY });
    layout.page.drawText('KGF', { x: cols.kgf, y: layout.y, size: 8, font: bold, color: GRAY });
    layout.page.drawText('MPa', { x: cols.mpa, y: layout.y, size: 8, font: bold, color: GRAY });
    layout.page.drawText('FCM', { x: cols.fcm, y: layout.y, size: 8, font: bold, color: GRAY });
    layout.y -= 2;
    layout.page.drawLine({
      start: { x: MARGIN, y: layout.y },
      end: { x: MARGIN + contentWidth, y: layout.y },
      thickness: 0.5,
      color: LIGHT,
    });

    for (const idade of bloco.idades) {
      const fcmLabel = idade.expurgada ? 'expurgada' : idade.fcm !== null ? `${idade.fcm}` : '—';
      for (const cp of idade.cps) {
        layout.ensure(12);
        layout.y -= 10;
        const kgf = cp.status === 'rompido' ? String(cp.cargaRupturaKgf ?? '—') : '—';
        const mpa = cp.status === 'rompido' ? String(cp.mpaCalculado ?? '—') : '—';
        layout.page.drawText(cp.codigoRastreio, {
          x: cols.cp,
          y: layout.y,
          size: 8,
          font,
          color: BLACK,
        });
        layout.page.drawText(`${idade.idadeAlvoDias} dias`, {
          x: cols.idade,
          y: layout.y,
          size: 8,
          font,
          color: BLACK,
        });
        layout.page.drawText(kgf, { x: cols.kgf, y: layout.y, size: 8, font, color: BLACK });
        layout.page.drawText(mpa, { x: cols.mpa, y: layout.y, size: 8, font, color: BLACK });
        layout.page.drawText(fcmLabel, { x: cols.fcm, y: layout.y, size: 8, font, color: BLACK });
        layout.y -= 2;
      }
    }
  }
  layout.gap(12);

  // ---------- Resistance chart (image + axis / fck labels) ----------
  layout.text('Curva de ganho de resistência', { size: 11, bold: true });
  const chartImage = await doc.embedPng(chartPng);
  const scale = contentWidth / chartGeometry.width;
  const chartHpdf = chartGeometry.height * scale;
  layout.ensure(chartHpdf + 8);
  const chartTop = layout.y;
  const chartBottomY = chartTop - chartHpdf;
  layout.page.drawImage(chartImage, {
    x: MARGIN,
    y: chartBottomY,
    width: contentWidth,
    height: chartHpdf,
  });

  // Map a geometry pixel (top-down) to PDF coordinates (bottom-up).
  const toPdfX = (gx: number) => MARGIN + gx * scale;
  const toPdfY = (gy: number) => chartTop - gy * scale;
  // MPa axis labels.
  for (const tick of chartGeometry.yTicks) {
    layout.page.drawText(String(Math.round(tick.value)), {
      x: MARGIN + chartGeometry.plot.x * scale - 22,
      y: toPdfY(tick.pos) - 3,
      size: 7,
      font,
      color: GRAY,
    });
  }
  // Age axis labels.
  for (const tick of chartGeometry.xTicks) {
    layout.page.drawText(`${tick.value}d`, {
      x: toPdfX(tick.pos) - 6,
      y: chartBottomY + 4,
      size: 7,
      font,
      color: GRAY,
    });
  }
  // fck reference label.
  if (chartGeometry.fckY !== null && report.header.fckProjeto !== null) {
    layout.page.drawText(`fck ${report.header.fckProjeto} MPa`, {
      x: MARGIN + contentWidth - 70,
      y: toPdfY(chartGeometry.fckY) + 2,
      size: 7,
      font: bold,
      color: RED,
    });
  }
  layout.y = chartBottomY - 8;

  // ---------- Considerações finais (standard + automatic caveats) ----------
  layout.text('Considerações finais', { size: 11, bold: true });
  for (const paragrafo of report.consideracoes) {
    for (const line of wrap(paragrafo, font, 9, contentWidth)) {
      layout.text(line, { size: 9, color: BLACK });
    }
    layout.gap(3);
  }
  layout.gap(16);

  // ---------- Signatures ----------
  layout.ensure(70);
  const sigY = layout.y - 30;
  const sigWidth = (contentWidth - 40) / 3;
  const signatures = [
    ['Responsável Técnica', 'Eng. — CREA'],
    ['Laboratorista', ''],
    ['Moldador', ''],
  ];
  signatures.forEach(([role, sub], i) => {
    const x = MARGIN + i * (sigWidth + 20);
    layout.page.drawLine({
      start: { x, y: sigY },
      end: { x: x + sigWidth, y: sigY },
      thickness: 0.5,
      color: GRAY,
    });
    layout.page.drawText(role, { x, y: sigY - 12, size: 8, font: bold, color: BLACK });
    if (sub) {
      layout.page.drawText(sub, { x, y: sigY - 22, size: 7, font, color: GRAY });
    }
  });
  layout.y = sigY - 34;

  // ---------- Footer: QR + legal text (on every page's bottom of last page) ----------
  const qrImage = await doc.embedPng(qrPng);
  const qrSize = 64;
  const lastPage = layout.page;
  lastPage.drawImage(qrImage, { x: MARGIN, y: MARGIN, width: qrSize, height: qrSize });
  lastPage.drawText('Validação pública', { x: MARGIN, y: MARGIN - 8, size: 6, font, color: GRAY });
  const footerLines = wrap(LEGAL_FOOTER, font, 6.5, contentWidth - qrSize - 12);
  footerLines.forEach((line, i) => {
    lastPage.drawText(line, {
      x: MARGIN + qrSize + 12,
      y: MARGIN + qrSize - 10 - i * 9,
      size: 6.5,
      font,
      color: GRAY,
    });
  });
  lastPage.drawText(`Código: ${codigoVerificacao}`, {
    x: MARGIN + qrSize + 12,
    y: MARGIN,
    size: 6,
    font,
    color: GRAY,
  });

  // ---------- Permission lock: ReadOnly, AllowPrinting, AllowCopy=false ----------
  // SPEC §5.3 / §6.2. userPassword empty (opens freely); ownerPassword random and
  // server-only (never exposed) so the restrictions cannot be lifted.
  const ownerPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  await doc.encrypt({
    ownerPassword,
    userPassword: '',
    permissions: {
      printing: 'highResolution',
      copying: false,
      modifying: false,
      annotating: false,
      contentAccessibility: false,
      documentAssembly: false,
      fillingForms: false,
    },
  });

  return doc.save();
}
