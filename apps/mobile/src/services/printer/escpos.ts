import type { CpLabelModel } from '@concreto/shared';
import QRCode from 'qrcode';

/**
 * ESC/POS label generator (SPEC §6.2: "gerador ESC/POS próprio"). Builds the
 * raw byte buffer for a single specimen label — init, text lines and the QR
 * Code as a raster bit image (`GS v 0`) — for a portable thermal BLE printer.
 * Pure and native-free, so it is fully unit testable.
 */

// ----- ESC/POS control bytes -----
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const INIT = [ESC, 0x40]; // ESC @  — reset printer
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const SIZE_NORMAL = [GS, 0x21, 0x00];
const SIZE_DOUBLE = [GS, 0x21, 0x11]; // double width + height
const FEED_3 = [ESC, 0x64, 0x03]; // ESC d 3 — feed 3 lines
const CUT_PARTIAL = [GS, 0x56, 0x01]; // GS V 1 — partial cut (no-op if unsupported)

/** Number of printer dots each QR module occupies (crispness vs. label width). */
const QR_MODULE_SCALE = 5;
/** Quiet zone around the QR, in modules (per the QR spec). */
const QR_QUIET_MODULES = 2;

/**
 * Folds accents to ASCII and drops anything outside printable ASCII, so label
 * text renders correctly regardless of the printer code page. [PREMISSA] The
 * label copy is intentionally accent-free ASCII to avoid code-page mojibake on
 * arbitrary portable printers.
 */
export function foldAscii(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[^\u0020-\u007e]/g, '?'); // keep printable ASCII only
}

function textBytes(text: string): number[] {
  const folded = foldAscii(text);
  const out: number[] = [];
  for (let i = 0; i < folded.length; i += 1) {
    out.push(folded.charCodeAt(i) & 0xff);
  }
  return out;
}

/**
 * Encodes `text` as a QR Code raster bit image using the `GS v 0` command.
 * Modules are scaled to {@link QR_MODULE_SCALE} dots and surrounded by a quiet
 * zone; 1 bit = black dot (MSB first).
 */
export function encodeQrRaster(
  text: string,
  moduleScale: number = QR_MODULE_SCALE,
  quiet: number = QR_QUIET_MODULES,
): number[] {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const src = qr.modules.data; // 1 = dark module
  const dim = (size + quiet * 2) * moduleScale; // side length in dots
  const bytesPerRow = Math.ceil(dim / 8);

  const out: number[] = [
    GS,
    0x76,
    0x30,
    0x00, // GS v 0, mode 0 (normal)
    bytesPerRow & 0xff,
    (bytesPerRow >> 8) & 0xff,
    dim & 0xff,
    (dim >> 8) & 0xff,
  ];

  for (let y = 0; y < dim; y += 1) {
    const moduleY = Math.floor(y / moduleScale) - quiet;
    for (let bx = 0; bx < bytesPerRow; bx += 1) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const x = bx * 8 + bit;
        let dark = 0;
        if (x < dim) {
          const moduleX = Math.floor(x / moduleScale) - quiet;
          if (moduleX >= 0 && moduleX < size && moduleY >= 0 && moduleY < size) {
            dark = src[moduleY * size + moduleX] ? 1 : 0;
          }
        }
        byte |= dark << (7 - bit);
      }
      out.push(byte);
    }
  }
  return out;
}

/**
 * Builds the full ESC/POS buffer for one specimen label (F-S005-1): obra sigla
 * (large, centered), molding date, target age and the readable ID, then the QR
 * Code (`codigo_rastreio`) as a raster, the human-readable code, and a cut.
 */
export function buildLabelBytes(label: CpLabelModel): Uint8Array {
  const bytes: number[] = [];
  bytes.push(...INIT);

  // Title — obra sigla, centered and double-size.
  bytes.push(...ALIGN_CENTER, ...SIZE_DOUBLE);
  bytes.push(...textBytes(label.obraSigla), LF);
  bytes.push(...SIZE_NORMAL);

  // Details — left aligned.
  bytes.push(...ALIGN_LEFT);
  bytes.push(...textBytes(`Moldagem: ${label.dataMoldagem}`), LF);
  bytes.push(...textBytes(`Idade-alvo: ${label.idadeAlvoDias}d`), LF);
  bytes.push(...textBytes(`ID: ${label.idLegivel}`), LF);

  // QR Code — centered raster of the tracking code.
  bytes.push(...ALIGN_CENTER);
  bytes.push(...encodeQrRaster(label.codigoRastreio), LF);
  bytes.push(...textBytes(label.codigoRastreio), LF);

  // Advance and cut.
  bytes.push(...ALIGN_LEFT, ...FEED_3, ...CUT_PARTIAL);
  return Uint8Array.from(bytes);
}
