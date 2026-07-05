import { MESSAGES } from '@concreto/shared';
import { useCallback, useRef, useState } from 'react';

import { BlePrinterTransport } from '../../services/printer/ble';
import {
  isPrinterError,
  type PrinterDevice,
  type PrinterTransport,
} from '../../services/printer/types';

import { printLabelBatch, type LabelPrintItem, type LabelPrintStatus } from './print-job';

/** Lifecycle of a print session (drives button-disabled / device-picker UI). */
export type PrinterPhase = 'idle' | 'preparing' | 'selecting' | 'printing' | 'done' | 'error';

/** Maps a printer failure to the exact PT copy (F-S005-1 sad paths). */
function messageForPrinterError(error: unknown): string {
  if (isPrinterError(error)) {
    switch (error.code) {
      case 'BLE_UNAVAILABLE':
        return MESSAGES.feature.bluetoothIndisponivel;
      case 'NO_DEVICE':
        return MESSAGES.feature.impressoraNaoEncontrada;
      default:
        return MESSAGES.feature.impressoraNaoRespondeu;
    }
  }
  return MESSAGES.http.serverError;
}

export interface PrinterSession {
  phase: PrinterPhase;
  /** Per-CP checklist status (F-S005-1 US03-CA3). */
  statuses: Record<string, LabelPrintStatus>;
  /** Candidate printers when more than one is paired (US03-CA4). */
  devices: PrinterDevice[];
  errorMessage: string | null;
  /** True while preparing/printing — disables the trigger to block double submit. */
  busy: boolean;
  /** Starts a print job for the given labels (all of a concretagem, or one). */
  print: (items: LabelPrintItem[]) => Promise<void>;
  /** Confirms the chosen printer after a multi-device selection. */
  selectDevice: (deviceId: string) => Promise<void>;
  /** Dismisses the device picker without printing. */
  cancelSelection: () => void;
}

/**
 * Owns a Bluetooth print session (F-S005-1/F-S005-2): permission/adapter checks,
 * optional device selection when several printers are paired, sequential
 * printing with the per-label checklist, and reprint of a single label. The
 * transport is injectable so the orchestration is testable without native BLE.
 */
export function usePrinterSession(transport?: PrinterTransport): PrinterSession {
  const transportRef = useRef<PrinterTransport | null>(transport ?? null);
  if (!transportRef.current) {
    transportRef.current = transport ?? new BlePrinterTransport();
  }
  const pendingRef = useRef<LabelPrintItem[]>([]);

  const [phase, setPhase] = useState<PrinterPhase>('idle');
  const [statuses, setStatuses] = useState<Record<string, LabelPrintStatus>>({});
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runBatch = useCallback(async (deviceId: string, items: LabelPrintItem[]) => {
    const link = transportRef.current;
    if (!link) {
      return;
    }
    setPhase('printing');
    try {
      await link.connect(deviceId);
      await printLabelBatch({
        transport: link,
        items,
        onProgress: ({ cpId, status }) => {
          setStatuses((prev) => ({ ...prev, [cpId]: status }));
        },
      });
      setPhase('done');
    } catch (error) {
      setErrorMessage(messageForPrinterError(error));
      setPhase('error');
    } finally {
      await link.disconnect();
    }
  }, []);

  const print = useCallback(
    async (items: LabelPrintItem[]) => {
      const link = transportRef.current;
      if (!link || items.length === 0) {
        return;
      }
      setErrorMessage(null);
      setStatuses((prev) => {
        const next = { ...prev };
        for (const item of items) {
          next[item.cpId] = 'pendente';
        }
        return next;
      });
      setPhase('preparing');
      try {
        await link.ensureReady();
        const available = await link.listDevices();
        if (available.length === 0) {
          setErrorMessage(MESSAGES.feature.impressoraNaoEncontrada);
          setPhase('error');
          return;
        }
        const [only] = available;
        if (available.length === 1 && only) {
          await runBatch(only.id, items);
          return;
        }
        // More than one paired printer → ask the operator to choose (US03-CA4).
        pendingRef.current = items;
        setDevices(available);
        setPhase('selecting');
      } catch (error) {
        setErrorMessage(messageForPrinterError(error));
        setPhase('error');
      }
    },
    [runBatch],
  );

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setDevices([]);
      await runBatch(deviceId, pendingRef.current);
    },
    [runBatch],
  );

  const cancelSelection = useCallback(() => {
    setDevices([]);
    pendingRef.current = [];
    setPhase('idle');
  }, []);

  return {
    phase,
    statuses,
    devices,
    errorMessage,
    busy: phase === 'preparing' || phase === 'printing',
    print,
    selectDevice,
    cancelSelection,
  };
}
