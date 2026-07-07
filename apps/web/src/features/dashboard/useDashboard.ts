import { useQuery } from '@tanstack/react-query';

import {
  loadConcretagensSemColeta,
  loadCpCounters,
  loadLaudosPendentes,
  loadProximosRompimentos,
  type ConcretagemSemColetaRow,
  type CpCounters,
  type LaudoPendenteRow,
  type ProximoRompimentoRow,
} from './dashboard-service';

/**
 * One independent query per dashboard card (F-S010-1) so each card owns its own
 * Loading/Error/Empty state and one failing indicator never blanks the others.
 */

export const DASHBOARD_KEYS = {
  cps: ['dashboard', 'cps'] as const,
  laudosPendentes: ['dashboard', 'laudos-pendentes'] as const,
  concretagensSemColeta: ['dashboard', 'concretagens-sem-coleta'] as const,
  proximosRompimentos: ['dashboard', 'proximos-rompimentos'] as const,
};

export function useCpCounters() {
  return useQuery<CpCounters>({ queryKey: DASHBOARD_KEYS.cps, queryFn: loadCpCounters });
}

export function useLaudosPendentes() {
  return useQuery<LaudoPendenteRow[]>({
    queryKey: DASHBOARD_KEYS.laudosPendentes,
    queryFn: loadLaudosPendentes,
  });
}

export function useConcretagensSemColeta() {
  return useQuery<ConcretagemSemColetaRow[]>({
    queryKey: DASHBOARD_KEYS.concretagensSemColeta,
    queryFn: loadConcretagensSemColeta,
  });
}

export function useProximosRompimentos() {
  return useQuery<ProximoRompimentoRow[]>({
    queryKey: DASHBOARD_KEYS.proximosRompimentos,
    queryFn: loadProximosRompimentos,
  });
}
