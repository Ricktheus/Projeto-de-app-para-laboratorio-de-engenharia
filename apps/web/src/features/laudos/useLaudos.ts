import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  agruparLaudo,
  baixarLaudoPdf,
  corrigirLaudo,
  emitirLaudoParcial,
  gerarLaudoPdf,
  getLaudoDetalhe,
  listLaudos,
  marcarProntoAssinatura,
  uploadLaudoAssinado,
  type LaudoDetalhe,
  type LaudoListRow,
} from './laudos-service';

export const LAUDOS_KEY = ['laudos', 'lista'] as const;
const laudoDetalheKey = (id: string) => ['laudos', 'detalhe', id] as const;

/** Loads the active reports (rascunho / pronto_assinatura / assinado). */
export function useLaudos() {
  return useQuery<LaudoListRow[]>({ queryKey: LAUDOS_KEY, queryFn: listLaudos });
}

/** Loads a single report with its consolidated per-age results. */
export function useLaudoDetalhe(laudoId: string | null) {
  return useQuery<LaudoDetalhe>({
    queryKey: laudoDetalheKey(laudoId ?? ''),
    queryFn: () => getLaudoDetalhe(laudoId as string),
    enabled: laudoId !== null,
  });
}

/** Invalidates both the report list and every loaded detail after a change. */
function useInvalidateLaudos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: LAUDOS_KEY });
    void queryClient.invalidateQueries({ queryKey: ['laudos', 'detalhe'] });
  };
}

/** Marks a draft `pronto_assinatura` (F-S007-3 sad path guarded server-side). */
export function useMarcarPronto() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: (laudoId: string) => marcarProntoAssinatura(laudoId),
    onSuccess: invalidate,
  });
}

/** Emits a 7d|14d partial report on demand (US13-CA2). */
export function useEmitirParcial() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: ({ concretagemId, idadeDias }: { concretagemId: string; idadeDias: number }) =>
      emitirLaudoParcial(concretagemId, idadeDias),
    onSuccess: invalidate,
  });
}

/** Groups several NFs of the same obra into one consolidated report (US13-CA3). */
export function useAgruparLaudo() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: (concretagemIds: string[]) => agruparLaudo(concretagemIds),
    onSuccess: invalidate,
  });
}

/** Generates the locked report PDF (F-S008-1 / US14). */
export function useGerarPdf() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: (laudoId: string) => gerarLaudoPdf(laudoId),
    onSuccess: invalidate,
  });
}

/** Uploads the signed PDF and publishes the report to `assinado` (F-S008-2 / US15). */
export function useUploadAssinado() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: ({
      laudoId,
      pdf,
      elaborador,
    }: {
      laudoId: string;
      pdf: File;
      elaborador?: File | null;
    }) => uploadLaudoAssinado(laudoId, pdf, elaborador),
    onSuccess: invalidate,
  });
}

/** Corrects a signed report, creating a new version (F-S008-3 / US22). */
export function useCorrigirLaudo() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: (laudoId: string) => corrigirLaudo(laudoId),
    onSuccess: invalidate,
  });
}

/** Downloads a stored report PDF via a short-lived signed URL (F-S008-2 CA1). */
export function useBaixarPdf() {
  return useMutation({ mutationFn: (pdfPath: string) => baixarLaudoPdf(pdfPath) });
}
