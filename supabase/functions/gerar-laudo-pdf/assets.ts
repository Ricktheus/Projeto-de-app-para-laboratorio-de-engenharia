/**
 * Raster asset generation for the laudo PDF (SPEC §6.2): the resistance chart is
 * an SVG (built in `packages/shared`) rasterized to PNG with `@resvg/resvg-wasm`
 * (no headless browser in Deno), and the footer QR is a PNG from `qrcode`. Both
 * are embedded by `pdf-lib`.
 *
 * `ChartRasterError` is thrown when rasterization fails, so the orchestrator can
 * return the SPEC's 500 "falha na rasterização do gráfico" (F-S008-1 sad path).
 */
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import QRCode from 'qrcode';

/** Thrown when the resistance chart cannot be rasterized (⇒ 500 + log). */
export class ChartRasterError extends Error {}

// resvg-wasm must initialize its WASM module once per isolate. The binary ships
// with the package; it is fetched from the same registry the import map pins.
const RESVG_WASM_URL = 'https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm';
let wasmReady: Promise<void> | null = null;

async function ensureResvgWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(fetch(RESVG_WASM_URL)).catch((error) => {
      // Reset so a later request can retry the initialization.
      wasmReady = null;
      throw error;
    });
  }
  await wasmReady;
}

/**
 * Rasterizes the chart SVG to a PNG at the given pixel width. Throws
 * {@link ChartRasterError} on any failure (F-S008-1: 500 + log).
 */
export async function rasterizeChartPng(svg: string, width: number): Promise<Uint8Array> {
  try {
    await ensureResvgWasm();
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: Math.round(width) } });
    return resvg.render().asPng();
  } catch (error) {
    throw new ChartRasterError(String(error));
  }
}

/** Generates a QR-code PNG for the public validation URL (SPEC §5.3). */
export async function generateQrPng(url: string): Promise<Uint8Array> {
  const dataUrl: string = await QRCode.toDataURL(url, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
  });
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
