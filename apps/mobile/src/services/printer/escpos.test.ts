import { buildCpLabel } from '@concreto/shared';

import { bytesToBase64, chunkBytes } from './encoding';
import { buildLabelBytes, encodeQrRaster, foldAscii } from './escpos';

/** Finds the start index of `needle` within `hay`, or -1. */
function indexOfSeq(hay: Uint8Array | number[], needle: number[]): number {
  const arr = Array.from(hay);
  for (let i = 0; i + needle.length <= arr.length; i += 1) {
    if (needle.every((b, j) => arr[i + j] === b)) {
      return i;
    }
  }
  return -1;
}

describe('foldAscii', () => {
  it('strips accents to plain ASCII', () => {
    expect(foldAscii('Concretagem à Válida ção')).toBe('Concretagem a Valida cao');
  });
});

describe('bytesToBase64', () => {
  it('encodes known vectors with padding', () => {
    expect(bytesToBase64(Uint8Array.from([]))).toBe('');
    expect(bytesToBase64(Uint8Array.from([0x4d]))).toBe('TQ==');
    expect(bytesToBase64(Uint8Array.from([0x48, 0x69]))).toBe('SGk=');
    expect(bytesToBase64(Uint8Array.from([0x4d, 0x61, 0x6e]))).toBe('TWFu');
  });
});

describe('chunkBytes', () => {
  it('splits into fixed-size chunks, last one shorter', () => {
    const chunks = chunkBytes(Uint8Array.from([1, 2, 3, 4, 5]), 2);
    expect(chunks.map((c) => Array.from(c))).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('rejects a non-positive chunk size', () => {
    expect(() => chunkBytes(Uint8Array.from([1]), 0)).toThrow();
  });
});

describe('encodeQrRaster', () => {
  it('starts with the GS v 0 raster header and carries a bitmap payload', () => {
    const raster = encodeQrRaster('CP-TEST-123');
    expect(raster.slice(0, 4)).toEqual([0x1d, 0x76, 0x30, 0x00]);
    const bytesPerRow = (raster[4] ?? 0) | ((raster[5] ?? 0) << 8);
    const height = (raster[6] ?? 0) | ((raster[7] ?? 0) << 8);
    expect(bytesPerRow).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(raster.length).toBe(8 + bytesPerRow * height);
  });
});

describe('buildLabelBytes (F-S005-1)', () => {
  const label = buildCpLabel({
    codigoRastreio: 'CP-ABCDEF0123',
    obraSigla: 'OBRA-A',
    dataMoldagem: '2026-05-20',
    idadeAlvoDias: 28,
  });
  const bytes = buildLabelBytes(label);

  it('begins with the ESC @ init sequence', () => {
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x1b, 0x40]);
  });

  it('embeds the QR raster of the tracking code', () => {
    expect(indexOfSeq(bytes, [0x1d, 0x76, 0x30, 0x00])).toBeGreaterThan(0);
  });

  it('prints the obra sigla and the human-readable tracking code', () => {
    expect(
      indexOfSeq(
        bytes,
        Array.from('OBRA-A', (c) => c.charCodeAt(0)),
      ),
    ).toBeGreaterThan(0);
    expect(
      indexOfSeq(
        bytes,
        Array.from('CP-ABCDEF0123', (c) => c.charCodeAt(0)),
      ),
    ).toBeGreaterThan(0);
  });

  it('ends with a cut command', () => {
    expect(indexOfSeq(bytes, [0x1d, 0x56, 0x01])).toBeGreaterThan(0);
  });
});
