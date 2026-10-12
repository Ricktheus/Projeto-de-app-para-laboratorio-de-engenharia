import { exportarExcelRequestSchema, MESSAGES, type ExportarExcelRequest } from '@concreto/shared';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ChartBar, MicrosoftExcelLogo, Scales, Truck } from '../../components/icons';
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
    <AppShell
      title="Comparativo de concreteiras"
      subtitle="Relatório consolidado em Excel comparando MPa/FCM por concreteira e fck alvo no período."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="surface flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success"
            >
              <MicrosoftExcelLogo size={22} weight="fill" />
            </span>
            <div>
              <h2 className="font-semibold">Filtros do relatório</h2>
              <p className="text-[13px] text-concreto-500">Só o período é obrigatório.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[13px] font-medium text-concreto-600">Período — de</span>
              <input
                type="date"
                value={de}
                max={ate || undefined}
                onChange={(e) => setDe(e.target.value)}
                aria-label="Período — de"
                className="control"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[13px] font-medium text-concreto-600">Período — até</span>
              <input
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(e) => setAte(e.target.value)}
                aria-label="Período — até"
                className="control"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[13px] font-medium text-concreto-600">
                Concreteira (opcional)
              </span>
              <input
                value={concreteira}
                onChange={(e) => setConcreteira(e.target.value)}
                placeholder="Todas"
                className="control"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[13px] font-medium text-concreto-600">
                FCK alvo — MPa (opcional)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={fckAlvo}
                onChange={(e) => setFckAlvo(e.target.value)}
                placeholder="Todos"
                className="control"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-concreto-600">Obra (opcional)</span>
            <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="control">
              <option value="">Todas as obras</option>
              {obraOptions.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.sigla} · {obra.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="border-t border-concreto-100 pt-4">
            <LoadingButton
              icon={<MicrosoftExcelLogo size={16} weight="bold" />}
              loading={exportar.isPending}
              loadingLabel={MESSAGES.feature.exportandoExcel}
              disabled={!periodoCompleto}
              onClick={handleExportar}
            >
              {MESSAGES.feature.exportarExcel}
            </LoadingButton>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-concreto-100 bg-concreto-50/60 p-6">
          <h2 className="eyebrow">O que o relatório traz</h2>
          {[
            {
              icon: <Truck size={18} />,
              title: 'Por concreteira',
              text: 'Resultados agrupados pela concreteira fornecedora de cada concretagem.',
            },
            {
              icon: <Scales size={18} />,
              title: 'Mesmo fck, lado a lado',
              text: 'Compara fornecedores para o mesmo fck alvo (ex.: 30 MPa) no mês.',
            },
            {
              icon: <ChartBar size={18} />,
              title: 'MPa e FCM por idade',
              text: 'Valores de cada CP e médias por idade, prontos para análise.',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex text-concreto-500">
                {item.icon}
              </span>
              <div>
                <p className="font-medium text-grafite">{item.title}</p>
                <p className="text-[13px] text-concreto-500">{item.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </AppShell>
  );
}
