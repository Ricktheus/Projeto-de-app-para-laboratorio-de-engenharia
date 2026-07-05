import { buildCpLabel, type CpLabelModel } from '@concreto/shared';

import type { PrinterTransport } from '../../services/printer/types';

import {
  printLabelBatch,
  printOneLabel,
  withTimeout,
  type BatchProgress,
  type LabelPrintItem,
} from './print-job';

const label = (n: number): CpLabelModel =>
  buildCpLabel({
    codigoRastreio: `CP-000000000${n}`,
    obraSigla: 'OBRA-A',
    dataMoldagem: '2026-05-20',
    idadeAlvoDias: 28,
  });

const items = (n: number): LabelPrintItem[] =>
  Array.from({ length: n }, (_, i) => ({ cpId: `cp-${i}`, label: label(i) }));

/** A transport whose write() behaviour is scripted per call index. */
function fakeTransport(behaviour: (callIndex: number) => Promise<void>): PrinterTransport {
  let call = 0;
  return {
    ensureReady: () => Promise.resolve(),
    listDevices: () => Promise.resolve([{ id: 'd1', name: 'Printer' }]),
    connect: () => Promise.resolve(),
    write: () => behaviour(call++),
    disconnect: () => Promise.resolve(),
  };
}

/** A promise that never settles — models a stalled/disconnected printer with no leaked timer. */
const neverResolves = () => new Promise<void>(() => {});

describe('withTimeout', () => {
  it('rejects with a TIMEOUT PrinterError when the promise stalls', async () => {
    await expect(withTimeout(neverResolves(), 10)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });
});

describe('printOneLabel', () => {
  it('marks a stalled printer as timed out after the 5s guard (US03-CA2)', async () => {
    const transport = fakeTransport(() => neverResolves());
    await expect(printOneLabel(transport, label(1), 20)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});

describe('printLabelBatch (F-S005-1)', () => {
  it('prints N labels and reports each as impressa (US03-CA1/CA3)', async () => {
    const transport = fakeTransport(() => Promise.resolve());
    const progress: BatchProgress[] = [];
    const statuses = await printLabelBatch({
      transport,
      items: items(4),
      onProgress: (p) => progress.push(p),
    });
    expect(statuses).toEqual(['impressa', 'impressa', 'impressa', 'impressa']);
    // Every label passes through imprimindo -> impressa.
    expect(progress.filter((p) => p.status === 'imprimindo')).toHaveLength(4);
    expect(progress.filter((p) => p.status === 'impressa')).toHaveLength(4);
  });

  it('continues after a failure, marking only that label falhou (US03-CA2)', async () => {
    // 2nd write rejects; the batch must not abort.
    const transport = fakeTransport((i) =>
      i === 1 ? Promise.reject(new Error('sem papel')) : Promise.resolve(),
    );
    const statuses = await printLabelBatch({ transport, items: items(3) });
    expect(statuses).toEqual(['impressa', 'falhou', 'impressa']);
  });

  it('reprints a single failed label on its own (US03 reprint / F-S005-2)', async () => {
    const transport = fakeTransport(() => Promise.resolve());
    const statuses = await printLabelBatch({
      transport,
      items: [{ cpId: 'cp-1', label: label(1) }],
    });
    expect(statuses).toEqual(['impressa']);
  });
});
