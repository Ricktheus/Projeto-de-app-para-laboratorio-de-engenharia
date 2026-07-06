import { exportarExcelRequestSchema, MESSAGES, type ExportarExcelRequest } from '@concreto/shared';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';
import { LoadingButton, useToast } from '../../components/ui';
import { useObras } from '../obras/useObras';

import { baixarArquivo } from './exportacao-service';
import { useExportarExcel } from './useExportacao';

const XLSX_FILENAME = 'comparativo-concreteiras.xlsx';

/**
 * Excel export screen (F-S009-3 / US23), engineers only (RBAC enforced by the
 * Edge Function + route guard). Filters: período (obrigatório), concreteira,
 * fck alvo e obra. The empty-result 422 surfaces the exact SPEC copy
 * ("Nenhum dado encontrado para os filtros selecionados.").
 */
export function ExportacaoPage() {
  const { show } = useToast();
  const exportar = useExportarExcel();
  const { data: obras } = useObras();

  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [concreteira, setConcreteira] = useState('');
  const [fckAlvo, setFckAlvo] = useState('');
  const [obraId, setObraId] = useState('');

  const obraOptions = useMemo(() => obras ?? [], [obras]);
  const periodoCompleto = de !== '' && ate !== '';

  async function handleExportar() {
    const filtros: ExportarExcelRequest = {
      periodo: { de, ate },
      concreteira: concreteira.trim() === '' ? null : concreteira.trim(),
      fckAlvo: fckAlvo.trim() === '' ? null : Number(fckAlvo),
      obraId: obraId === '' ? null : obraId,
    };

    const parsed = exportarExcelRequestSchema.safeParse(filtros);
    if (!parsed.success) {
      show(MESSAGES.http.validation, 'error');
      return;
    }

    try {
      const blob = await exportar.mutateAsync(parsed.data);
      baixarArquivo(blob, XLSX_FILENAME);
      show(MESSAGES.feature.exportacaoConcluida, 'success');
    } catch (error) {
      // 422 SEM_DADOS surfaces the exact SPEC copy via EdgeFunctionError.message.
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  return (
    <AppShell title="Exportar Excel">
      <ManagementNav />

      <p className="mb-6 text-gray-600">
        Relatório consolidado comparando MPa/FCM por concreteira e fck alvo no período.
      </p>

      <div className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Período — de</span>
            <input
              type="date"
              value={de}
              max={ate || undefined}
              onChange={(e) => setDe(e.target.value)}
              aria-label="Período — de"
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Período — até</span>
            <input
              type="date"
              value={ate}
              min={de || undefined}
              onChange={(e) => setAte(e.target.value)}
              aria-label="Período — até"
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Concreteira (opcional)</span>
            <input
              value={concreteira}
              onChange={(e) => setConcreteira(e.target.value)}
              placeholder="Todas"
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">FCK alvo — MPa (opcional)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={fckAlvo}
              onChange={(e) => setFckAlvo(e.target.value)}
              placeholder="Todos"
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Obra (opcional)</span>
          <select
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
          >
            <option value="">Todas as obras</option>
            {obraOptions.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.sigla} · {obra.nome}
              </option>
            ))}
          </select>
        </label>

        <div>
          <LoadingButton
            loading={exportar.isPending}
            loadingLabel={MESSAGES.feature.exportandoExcel}
            disabled={!periodoCompleto}
            onClick={handleExportar}
          >
            {MESSAGES.feature.exportarExcel}
          </LoadingButton>
        </div>
      </div>
    </AppShell>
  );
}
