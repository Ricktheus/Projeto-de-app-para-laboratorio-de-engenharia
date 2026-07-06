/**
 * Builds the styled `.xlsx` comparison workbook (F-S009-3 / US23) from the shared
 * aggregation. Presentation only: the numbers come from
 * `buildComparativoConcreteira` so they match the laudo (DRY). PT headers.
 */
import type { Comparativo, ExportarExcelRequest } from '@concreto/shared';
import ExcelJS from 'exceljs';

/** Column layout of the comparison sheet (key + width; header written manually). */
const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Concreteira', key: 'concreteira', width: 22 },
  { header: 'FCK alvo (MPa)', key: 'fckAlvo', width: 16 },
  { header: 'Idade (dias)', key: 'idadeDias', width: 14 },
  { header: 'Nº CPs', key: 'nCps', width: 10 },
  { header: 'FCM (MPa)', key: 'fcmMpa', width: 14 },
  { header: 'MPa mín.', key: 'mpaMin', width: 12 },
  { header: 'MPa máx.', key: 'mpaMax', width: 12 },
  { header: '% do FCK', key: 'percentualFck', width: 12 },
  { header: 'Atingiu FCK', key: 'atingiuFck', width: 14 },
];

function filtrosResumo(filtros: ExportarExcelRequest): string {
  const partes = [`Período: ${filtros.periodo.de} a ${filtros.periodo.ate}`];
  partes.push(`Concreteira: ${filtros.concreteira ?? 'Todas'}`);
  partes.push(`FCK alvo: ${typeof filtros.fckAlvo === 'number' ? filtros.fckAlvo : 'Todos'}`);
  partes.push(`Obra: ${filtros.obraId ? filtros.obraId : 'Todas'}`);
  return partes.join('   ·   ');
}

const HEADER_ROW = 4;

/** Renders the comparison to an `.xlsx` byte buffer. */
export async function buildComparativoWorkbook(
  comparativo: Comparativo,
  filtros: ExportarExcelRequest,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Laboratório de Controle Tecnológico de Concreto';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Comparativo por concreteira');

  // Column keys + widths (no auto header — we place it manually below the banner).
  COLUMNS.forEach((col, i) => {
    const column = sheet.getColumn(i + 1);
    column.key = col.key;
    column.width = col.width;
  });

  // Title + filters banner (rows 1–2).
  sheet.mergeCells(1, 1, 1, COLUMNS.length);
  const title = sheet.getCell(1, 1);
  title.value = 'Comparativo de resistência por concreteira';
  title.font = { bold: true, size: 14 };
  sheet.mergeCells(2, 1, 2, COLUMNS.length);
  const resumo = sheet.getCell(2, 1);
  resumo.value = filtrosResumo(filtros);
  resumo.font = { italic: true, color: { argb: 'FF4B5563' } };

  // Header row (row 4).
  const headerRow = sheet.getRow(HEADER_ROW);
  COLUMNS.forEach((col, i) => {
    headerRow.getCell(i + 1).value = col.header;
  });
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.commit();

  // Data rows (appended from row 5).
  for (const linha of comparativo.linhas) {
    const row = sheet.addRow({
      concreteira: linha.concreteira,
      fckAlvo: linha.fckAlvo,
      idadeDias: linha.idadeDias,
      nCps: linha.nCps,
      fcmMpa: linha.fcmMpa,
      mpaMin: linha.mpaMin,
      mpaMax: linha.mpaMax,
      percentualFck: linha.percentualFck,
      atingiuFck: linha.atingiuFck ? 'Sim' : 'Não',
    });
    if (!linha.atingiuFck) {
      // Flag below-target FCM in red for quick scanning.
      row.getCell('atingiuFck').font = { color: { argb: 'FFDC2626' }, bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
