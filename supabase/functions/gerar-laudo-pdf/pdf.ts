/**
 * Composes the locked report PDF (F-S008-1, PRD §11) with `@cantoo/pdf-lib`, in
 * the single standardized layout of PLANO_NOVO_APP.md §6.10:
 *
 * - graphite header band on every page (lab identity + report number);
 * - identification grid (cliente, obra, fck, slump, molde, nº de CPs);
 * - results matrix per NF (DATA|QUADRA|LOTE|NF|LACRE caption, then
 *   CP|IDADE|CARGA|MPa|FCM rows grouped by age, FCM once per age);
 * - resistance chart (rasterized elsewhere) with a NEUTRAL fck line;
 * - considerações finais, signature blocks;
 * - footer on every page: validation QR, verification code, legal text and
 *   "Página X de Y".
 *
 * No photos (engineer decision). Numbers in pt-BR (decimal comma). Finally it
 * applies the permission lock `ReadOnly=true, AllowPrinting=true,
 * AllowCopy=false` (SPEC §5.3 / §6.2 — engineer decision: PDF com senha) and
 * returns the encrypted bytes.
 *
 * The numbers, caveats and chart geometry all come from `packages/shared`; this
 * module is pure layout. Fonts are the PDF standard Helvetica family (WinAnsi —
 * covers pt-BR accents, "·", "—", "×", "±", "°").
 */
import {
  BRAND,
  formatMpaBr,
  formatNumberBr,
  type ChartGeometry,
  type LaudoReport,
} from '@concreto/shared';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';

/** Signatory printed under the RT signature line. */
export interface ResponsavelTecnico {
  nome: string;
  crea: string;
}

/** Everything the composer needs beyond the domain report model. */
export interface PdfComposeInput {
  report: LaudoReport;
  chartPng: Uint8Array;
  chartGeometry: ChartGeometry;
  qrPng: Uint8Array;
  codigoVerificacao: string;
  /** RT name + CREA (from the lab configuration); blank lines when absent. */
  responsavelTecnico?: ResponsavelTecnico | null;
  /** Generation timestamp printed in the footer (defaults to now). */
  geradoEm?: Date;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const HEADER_H = 62;
const FOOTER_H = 64;
const CONTENT_TOP = A4.height - HEADER_H - 22;
const CONTENT_BOTTOM = FOOTER_H + 16;

// "Concreto & Sinalização" palette (plan §6.2).
const GRAFITE = rgb(0.09, 0.094, 0.102); // #17181A
const SINAL = rgb(1, 0.761, 0.102); // #FFC21A
const TEXT_2 = rgb(0.333, 0.333, 0.31); // #55554F
const TEXT_3 = rgb(0.431, 0.431, 0.404); // #6E6E67
const LINE = rgb(0.906, 0.906, 0.886); // #E7E7E2
const ZEBRA = rgb(0.98, 0.98, 0.973); // #FAFAF8
const PANEL = rgb(0.953, 0.953, 0.941); // #F3F3F0
const WHITE = rgb(1, 1, 1);

const LEGAL_FOOTER =
  'Os resultados referem-se exclusivamente às amostras ensaiadas. Reprodução parcial proibida. ' +
  'Válido apenas com a assinatura digital da Responsável Técnica. Confira a autenticidade pelo QR Code.';

type Font = PDFFont;

/** Wraps a paragraph to `maxWidth`, returning the display lines. */
function wrap(text: string, font: Font, size: number, maxWidth: number): string[] {
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

/** Truncates `text` with an ellipsis so it fits `maxWidth`. */
function fit(text: string, font: Font, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Top-down layout cursor; new pages get the header band automatically. */
class Layout {
  page!: PDFPage;
  y = 0;
  readonly pages: PDFPage[] = [];

  constructor(
    private doc: PDFDocument,
    readonly font: Font,
    readonly bold: Font,
    private numero: string,
  ) {
    this.addPage();
  }

  addPage(): void {
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.pages.push(this.page);
    this.drawHeader();
    this.y = CONTENT_TOP;
  }

  /** Ensures `h` points of vertical space remain, adding a page otherwise. */
  ensure(h: number): boolean {
    if (this.y - h < CONTENT_BOTTOM) {
      this.addPage();
      return true;
    }
    return false;
  }

  text(
    value: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
  ): void {
    const size = opts.size ?? 9;
    this.ensure(size + 4);
    this.y -= size;
    this.page.drawText(value, {
      x: opts.x ?? MARGIN,
      y: this.y,
      size,
      font: opts.bold ? this.bold : this.font,
      color: opts.color ?? GRAFITE,
    });
    this.y -= 4;
  }

  /** Section title with a short signal-yellow marker. */
  section(title: string): void {
    this.ensure(28);
    this.y -= 14;
    this.page.drawRectangle({ x: MARGIN, y: this.y - 1, width: 3, height: 11, color: SINAL });
    this.page.drawText(title.toUpperCase(), {
      x: MARGIN + 9,
      y: this.y,
      size: 8.5,
      font: this.bold,
      color: GRAFITE,
    });
    this.y -= 10;
  }

  gap(h: number): void {
    this.y -= h;
  }

  private drawHeader(): void {
    const p = this.page;
    const top = A4.height;
    p.drawRectangle({ x: 0, y: top - HEADER_H, width: A4.width, height: HEADER_H, color: GRAFITE });
    p.drawRectangle({ x: 0, y: top - HEADER_H - 3, width: A4.width, height: 3, color: SINAL });
    // Cylinder mark.
    const cx = MARGIN + 11;
    const cy = top - HEADER_H / 2;
    p.drawEllipse({ x: cx, y: cy + 9, xScale: 8, yScale: 3, borderColor: SINAL, borderWidth: 1.6 });
    p.drawLine({
      start: { x: cx - 8, y: cy + 9 },
      end: { x: cx - 8, y: cy - 9 },
      thickness: 1.6,
      color: SINAL,
    });
    p.drawLine({
      start: { x: cx + 8, y: cy + 9 },
      end: { x: cx + 8, y: cy - 9 },
      thickness: 1.6,
      color: SINAL,
    });
    p.drawEllipse({ x: cx, y: cy - 9, xScale: 8, yScale: 3, borderColor: SINAL, borderWidth: 1.6 });

    p.drawText(BRAND.nome, { x: MARGIN + 30, y: cy + 2, size: 13, font: this.bold, color: WHITE });
    p.drawText(BRAND.tagline, {
      x: MARGIN + 30,
      y: cy - 11,
      size: 8,
      font: this.font,
      color: rgb(0.7, 0.7, 0.67),
    });

    const label = 'RELATÓRIO DE ENSAIO';
    const lw = this.bold.widthOfTextAtSize(label, 7);
    p.drawText(label, {
      x: A4.width - MARGIN - lw,
      y: cy + 4,
      size: 7,
      font: this.bold,
      color: SINAL,
    });
    const numero = fit(this.numero, this.bold, 12, 200);
    const nw = this.bold.widthOfTextAtSize(numero, 12);
    p.drawText(numero, {
      x: A4.width - MARGIN - nw,
      y: cy - 11,
      size: 12,
      font: this.bold,
      color: WHITE,
    });
  }
}

/** Builds the locked report PDF bytes. */
export async function composeLaudoPdf(input: PdfComposeInput): Promise<Uint8Array> {
  const { report, chartPng, chartGeometry, qrPng, codigoVerificacao } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Laudo ${report.header.numero}`);
  doc.setSubject('Ensaio de resistência à compressão de corpos de prova cilíndricos');
  doc.setKeywords([codigoVerificacao]);
  doc.setProducer(BRAND.nome);
  doc.setCreator('Rastro');

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const layout = new Layout(doc, font, bold, report.header.numero);
  const contentWidth = A4.width - MARGIN * 2;

  // ---------- Title ----------
  layout.text('Ensaio de resistência à compressão', { size: 16, bold: true });
  layout.text(
    'Corpos de prova cilíndricos de concreto · ABNT NBR 5738 (moldagem e cura) · ABNT NBR 5739 (ensaio)',
    { size: 8, color: TEXT_3 },
  );
  layout.gap(8);

  // ---------- Identification grid ----------
  const h = report.header;
  const meta: [string, string][] = [
    ['Cliente', h.clienteNome],
    ['Obra', `${h.obraSigla} — ${h.obraNome}`],
    ['Endereço', h.obraEndereco],
    ['Contato', h.obraContato],
    ['fck de projeto', h.fckProjeto !== null ? `${formatNumberBr(h.fckProjeto)} MPa` : '—'],
    ['Abatimento (slump)', h.slump],
    ['Molde do CP (nominal)', h.medidaCp],
    ['Nº de corpos de prova', String(h.numCps)],
  ];
  const colW = contentWidth / 2;
  const rowH = 26;
  const gridH = Math.ceil(meta.length / 2) * rowH + 8;
  layout.ensure(gridH);
  const gridTop = layout.y;
  layout.page.drawRectangle({
    x: MARGIN,
    y: gridTop - gridH,
    width: contentWidth,
    height: gridH,
    color: ZEBRA,
    borderColor: LINE,
    borderWidth: 0.75,
  });
  meta.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + 12 + col * colW;
    const y = gridTop - 14 - row * rowH;
    layout.page.drawText(label.toUpperCase(), { x, y, size: 6.5, font: bold, color: TEXT_3 });
    layout.page.drawText(fit(value, font, 9.5, colW - 24), {
      x,
      y: y - 11,
      size: 9.5,
      font,
      color: GRAFITE,
    });
  });
  layout.y = gridTop - gridH - 6;

  // ---------- Results matrix, one block per NF ----------
  layout.section('Resultados dos ensaios');
  const cols = [
    { key: 'cp', label: 'CP', x: MARGIN + 8, align: 'left' as const },
    { key: 'idade', label: 'IDADE', x: MARGIN + 190, align: 'left' as const },
    { key: 'kgf', label: 'CARGA (kgf)', x: MARGIN + 340, align: 'right' as const },
    { key: 'mpa', label: 'MPa', x: MARGIN + 420, align: 'right' as const },
    { key: 'fcm', label: 'FCM (MPa)', x: MARGIN + contentWidth - 8, align: 'right' as const },
  ];
  const drawCell = (
    value: string,
    col: (typeof cols)[number],
    y: number,
    size: number,
    f: Font,
    color = GRAFITE,
  ) => {
    const w = f.widthOfTextAtSize(value, size);
    layout.page.drawText(value, {
      x: col.align === 'right' ? col.x - w : col.x,
      y,
      size,
      font: f,
      color,
    });
  };
  const drawTableHeader = () => {
    layout.ensure(18);
    layout.page.drawRectangle({
      x: MARGIN,
      y: layout.y - 16,
      width: contentWidth,
      height: 16,
      color: GRAFITE,
    });
    for (const col of cols) {
      drawCell(col.label, col, layout.y - 11, 7, bold, WHITE);
    }
    layout.y -= 16;
  };

  for (const bloco of report.blocos) {
    layout.ensure(60);
    layout.gap(4);
    const caption =
      `DATA ${bloco.dataConcretagem}   ·   QUADRA ${bloco.quadra}   ·   LOTE ${bloco.lote}   ·   ` +
      `NF ${bloco.nfNumero}   ·   LACRE ${bloco.lacre}`;
    layout.page.drawRectangle({
      x: MARGIN,
      y: layout.y - 16,
      width: contentWidth,
      height: 16,
      color: PANEL,
    });
    layout.page.drawText(fit(caption, bold, 7.5, contentWidth - 16), {
      x: MARGIN + 8,
      y: layout.y - 11,
      size: 7.5,
      font: bold,
      color: TEXT_2,
    });
    layout.y -= 16;
    drawTableHeader();

    let zebra = false;
    for (const idade of bloco.idades) {
      const fcmLabel = idade.expurgada
        ? 'expurgada'
        : idade.fcm !== null
          ? formatMpaBr(idade.fcm)
          : 'pendente';
      idade.cps.forEach((cp, i) => {
        if (layout.ensure(15)) {
          drawTableHeader();
        }
        const rowTop = layout.y;
        if (zebra) {
          layout.page.drawRectangle({
            x: MARGIN,
            y: rowTop - 15,
            width: contentWidth,
            height: 15,
            color: ZEBRA,
          });
        }
        const y = rowTop - 10.5;
        const rompido = cp.status === 'rompido';
        const dim = cp.status === 'expurgado' || cp.status === 'descartado';
        const color = dim ? TEXT_3 : GRAFITE;
        drawCell(cp.codigoRastreio, cols[0]!, y, 8, font, color);
        drawCell(`${idade.idadeAlvoDias} dias`, cols[1]!, y, 8, font, color);
        drawCell(rompido ? formatNumberBr(cp.cargaRupturaKgf) : '—', cols[2]!, y, 8, font, color);
        drawCell(
          rompido ? formatMpaBr(cp.mpaCalculado) : '—',
          cols[3]!,
          y,
          8,
          rompido ? bold : font,
          color,
        );
        if (dim) {
          const w = font.widthOfTextAtSize(cp.codigoRastreio, 8);
          layout.page.drawLine({
            start: { x: cols[0]!.x, y: y + 2.8 },
            end: { x: cols[0]!.x + w, y: y + 2.8 },
            thickness: 0.6,
            color: TEXT_3,
          });
        }
        if (i === 0) {
          drawCell(fcmLabel, cols[4]!, y, 8.5, bold, idade.fcm !== null ? GRAFITE : TEXT_3);
        }
        layout.y -= 15;
        zebra = !zebra;
      });
      layout.page.drawLine({
        start: { x: MARGIN, y: layout.y },
        end: { x: MARGIN + contentWidth, y: layout.y },
        thickness: 0.5,
        color: LINE,
      });
    }
    layout.gap(10);
  }

  // ---------- Resistance chart (image + axis / fck labels) ----------
  const chartImage = await doc.embedPng(chartPng);
  // Capped height so a typical report (1–2 NFs) fits on a single page.
  const CHART_MAX_H = 150;
  const scale = Math.min(
    (contentWidth - 24) / chartGeometry.width,
    CHART_MAX_H / chartGeometry.height,
  );
  const chartW = chartGeometry.width * scale;
  const chartHpdf = chartGeometry.height * scale;
  layout.ensure(chartHpdf + 50);
  layout.section('Curva de ganho de resistência');
  const boxTop = layout.y;
  const boxH = chartHpdf + 24;
  layout.page.drawRectangle({
    x: MARGIN,
    y: boxTop - boxH,
    width: contentWidth,
    height: boxH,
    borderColor: LINE,
    borderWidth: 0.75,
  });
  const chartLeft = MARGIN + (contentWidth - chartW) / 2;
  const chartTop = boxTop - 8;
  const chartBottomY = chartTop - chartHpdf;
  layout.page.drawImage(chartImage, {
    x: chartLeft,
    y: chartBottomY,
    width: chartW,
    height: chartHpdf,
  });
  const toPdfX = (gx: number) => chartLeft + gx * scale;
  const toPdfY = (gy: number) => chartTop - gy * scale;
  for (const tick of chartGeometry.yTicks) {
    layout.page.drawText(String(Math.round(tick.value)), {
      x: chartLeft + chartGeometry.plot.x * scale - 18,
      y: toPdfY(tick.pos) - 3,
      size: 7,
      font,
      color: TEXT_3,
    });
  }
  for (const tick of chartGeometry.xTicks) {
    layout.page.drawText(`${tick.value}d`, {
      x: toPdfX(tick.pos) - 6,
      y: chartBottomY - 2,
      size: 7,
      font,
      color: TEXT_3,
    });
  }
  layout.page.drawText('MPa', {
    x: chartLeft,
    y: chartTop - 2,
    size: 6.5,
    font: bold,
    color: TEXT_3,
  });
  // fck reference label — neutral graphite, never red (plan §6.2).
  if (chartGeometry.fckY !== null && h.fckProjeto !== null) {
    const label = `fck ${formatNumberBr(h.fckProjeto)} MPa`;
    layout.page.drawText(label, {
      x: chartLeft + chartGeometry.plot.x * scale + 6,
      y: toPdfY(chartGeometry.fckY) + 3,
      size: 7,
      font: bold,
      color: GRAFITE,
    });
  }
  layout.y = boxTop - boxH - 6;

  // ---------- Considerações finais (standard + automatic caveats) ----------
  // Keep the closing text and the signatures on the same page (the RT signs
  // under the caveats, never on an orphan page).
  const paragrafos = report.consideracoes.map((p) => wrap(p, font, 8.5, contentWidth));
  const closingH =
    28 + paragrafos.reduce((sum, lines) => sum + lines.length * 12.5 + 3, 0) + 36 + 44;
  layout.ensure(closingH);
  layout.section('Considerações finais');
  for (const lines of paragrafos) {
    for (const line of lines) {
      layout.text(line, { size: 8.5, color: TEXT_2 });
    }
    layout.gap(3);
  }

  // ---------- Signatures ----------
  layout.ensure(80);
  layout.gap(36);
  const sigY = layout.y;
  const sigWidth = (contentWidth - 40) / 3;
  const rt = input.responsavelTecnico;
  const signatures: [string, string, string][] = [
    ['Responsável Técnica', rt?.nome ?? '', rt?.crea ? `CREA ${rt.crea}` : 'CREA'],
    ['Laboratorista', '', ''],
    ['Moldador', '', ''],
  ];
  signatures.forEach(([role, nome, sub], i) => {
    const x = MARGIN + i * (sigWidth + 20);
    layout.page.drawLine({
      start: { x, y: sigY },
      end: { x: x + sigWidth, y: sigY },
      thickness: 0.6,
      color: TEXT_3,
    });
    layout.page.drawText(role.toUpperCase(), {
      x,
      y: sigY - 11,
      size: 6.5,
      font: bold,
      color: TEXT_3,
    });
    if (nome) {
      layout.page.drawText(fit(nome, font, 8.5, sigWidth), {
        x,
        y: sigY - 22,
        size: 8.5,
        font,
        color: GRAFITE,
      });
    }
    if (sub) {
      layout.page.drawText(sub, { x, y: sigY - (nome ? 32 : 22), size: 7.5, font, color: TEXT_2 });
    }
  });
  layout.y = sigY - 40;

  // ---------- Footer on every page: QR + code + legal text + page number ----------
  const qrImage = await doc.embedPng(qrPng);
  const qrSize = 46;
  const total = layout.pages.length;
  const geradoEm = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(input.geradoEm ?? new Date());
  const textX = MARGIN + qrSize + 10;
  const textW = contentWidth - qrSize - 10 - 70;
  const legalLines = wrap(LEGAL_FOOTER, font, 6.5, textW);
  layout.pages.forEach((page, i) => {
    page.drawLine({
      start: { x: MARGIN, y: FOOTER_H + 4 },
      end: { x: A4.width - MARGIN, y: FOOTER_H + 4 },
      thickness: 0.5,
      color: LINE,
    });
    page.drawImage(qrImage, { x: MARGIN, y: 14, width: qrSize, height: qrSize });
    page.drawText(`Código de verificação: ${codigoVerificacao}`, {
      x: textX,
      y: 50,
      size: 6.5,
      font: bold,
      color: GRAFITE,
    });
    legalLines.forEach((line, j) => {
      page.drawText(line, { x: textX, y: 40 - j * 8.5, size: 6.5, font, color: TEXT_3 });
    });
    page.drawText(`Gerado em ${geradoEm}`, { x: textX, y: 14, size: 6, font, color: TEXT_3 });
    const pageLabel = `Página ${i + 1} de ${total}`;
    const pw = bold.widthOfTextAtSize(pageLabel, 7);
    page.drawText(pageLabel, {
      x: A4.width - MARGIN - pw,
      y: 50,
      size: 7,
      font: bold,
      color: GRAFITE,
    });
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
      // Accessibility extraction stays allowed (M6): screen readers must reach the
      // content — restricting it is deprecated in PDF 2.0 and hurts a11y without
      // adding anti-fraud value (the QR + integrity hash are the real controls).
      contentAccessibility: true,
      documentAssembly: false,
      fillingForms: false,
    },
  });

  return doc.save();
}
