/**
 * Byte/base64 helpers for the BLE printer transport. react-native-ble-plx
 * writes characteristic values as base64 strings, so the ESC/POS buffer is
 * chunked and base64-encoded here. Kept pure (no native import) so it is unit
 * testable.
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encodes a byte buffer as a base64 string (RFC 4648, with padding). */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += B64_ALPHABET[(triple >> 18) & 0x3f];
    out += B64_ALPHABET[(triple >> 12) & 0x3f];
    out += i + 1 < bytes.length ? B64_ALPHABET[(triple >> 6) & 0x3f] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[triple & 0x3f] : '=';
  }
  return out;
}

/**
 * Splits a buffer into fixed-size chunks (BLE MTU is small, so a full label is
 * sent as several writes). The last chunk may be shorter.
 */
export function chunkBytes(bytes: Uint8Array, chunkSize: number): Uint8Array[] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be positive');
  }
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return chunks;
}
