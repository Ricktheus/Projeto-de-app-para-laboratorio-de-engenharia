/** A discoverable Bluetooth printer. */
export interface PrinterDevice {
  id: string;
  name: string;
}

/** Machine codes for printer failures (mapped to PT copy by the UI). */
export type PrinterErrorCode =
  | 'BLE_UNAVAILABLE' // adapter off, unsupported, or permission denied
  | 'NO_DEVICE' // no printer found/paired
  | 'CONNECT_FAILED'
  | 'WRITE_FAILED'
  | 'TIMEOUT';

/** Error thrown by the printer transport, carrying a stable machine code. */
export class PrinterError extends Error {
  readonly code: PrinterErrorCode;

  constructor(code: PrinterErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PrinterError';
    this.code = code;
    Object.setPrototypeOf(this, PrinterError.prototype);
  }
}

/** Type guard for {@link PrinterError}. */
export function isPrinterError(error: unknown): error is PrinterError {
  return error instanceof PrinterError;
}

/**
 * Transport abstraction over the physical BLE link. The print orchestration
 * (`features/etiquetas/print-job.ts`) depends only on this interface, so it is
 * testable with a fake transport and the concrete `react-native-ble-plx`
 * implementation stays isolated (SOLID: dependency inversion).
 */
export interface PrinterTransport {
  /** Ensures BLE is on and permitted; throws PrinterError('BLE_UNAVAILABLE'). */
  ensureReady(): Promise<void>;
  /** Discovers candidate printers (paired/known/advertising). */
  listDevices(): Promise<PrinterDevice[]>;
  /** Connects to a device by id; throws PrinterError('CONNECT_FAILED'). */
  connect(deviceId: string): Promise<void>;
  /** Writes a raw ESC/POS buffer to the connected device. */
  write(bytes: Uint8Array): Promise<void>;
  /** Disconnects (best-effort; never throws). */
  disconnect(): Promise<void>;
}
