import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import { BleManager, State, type Characteristic, type Device } from 'react-native-ble-plx';

import { bytesToBase64, chunkBytes } from './encoding';
import { PrinterError, type PrinterDevice, type PrinterTransport } from './types';

/**
 * Concrete BLE printer transport (react-native-ble-plx). Requires a dev client
 * (EAS Build) — it does NOT run in Expo Go (SPEC §6.2 / Apêndice A premise #7).
 * All native access is isolated here so the print orchestration stays testable.
 */

/** BLE MTU is small; ESC/POS buffers are sent in modest chunks. */
const WRITE_CHUNK_SIZE = 180;
/** How long to scan for advertising printers before returning the list. */
const SCAN_DURATION_MS = 4000;

const PERM_BLUETOOTH_SCAN = 'android.permission.BLUETOOTH_SCAN' as Permission;
const PERM_BLUETOOTH_CONNECT = 'android.permission.BLUETOOTH_CONNECT' as Permission;
const PERM_FINE_LOCATION = 'android.permission.ACCESS_FINE_LOCATION' as Permission;

/** Requests the Android BLE runtime permissions (no-op on iOS). */
async function ensureAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (typeof Platform.Version === 'number' && Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PERM_BLUETOOTH_SCAN,
      PERM_BLUETOOTH_CONNECT,
    ]);
    return (
      result[PERM_BLUETOOTH_SCAN] === 'granted' && result[PERM_BLUETOOTH_CONNECT] === 'granted'
    );
  }
  const granted = await PermissionsAndroid.request(PERM_FINE_LOCATION);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export class BlePrinterTransport implements PrinterTransport {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private serviceUuid: string | null = null;
  private characteristicUuid: string | null = null;

  private getManager(): BleManager {
    if (!this.manager) {
      this.manager = new BleManager();
    }
    return this.manager;
  }

  async ensureReady(): Promise<void> {
    const permitted = await ensureAndroidPermissions();
    if (!permitted) {
      throw new PrinterError('BLE_UNAVAILABLE', 'Permissão de Bluetooth negada.');
    }
    const state = await this.getManager().state();
    if (state !== State.PoweredOn) {
      throw new PrinterError('BLE_UNAVAILABLE', `Bluetooth indisponível (${state}).`);
    }
  }

  listDevices(): Promise<PrinterDevice[]> {
    const manager = this.getManager();
    const found = new Map<string, PrinterDevice>();
    return new Promise<PrinterDevice[]>((resolve, reject) => {
      manager.startDeviceScan(null, null, (error, scanned) => {
        if (error) {
          manager.stopDeviceScan();
          reject(new PrinterError('BLE_UNAVAILABLE', error.message));
          return;
        }
        // Only named devices are useful choices for the operator.
        if (scanned?.name) {
          found.set(scanned.id, { id: scanned.id, name: scanned.name });
        }
      });
      setTimeout(() => {
        manager.stopDeviceScan();
        resolve([...found.values()]);
      }, SCAN_DURATION_MS);
    });
  }

  async connect(deviceId: string): Promise<void> {
    try {
      const connected = await this.getManager().connectToDevice(deviceId);
      await connected.discoverAllServicesAndCharacteristics();
      const writable = await this.findWritableCharacteristic(connected);
      if (!writable) {
        throw new PrinterError('CONNECT_FAILED', 'Nenhuma característica de escrita encontrada.');
      }
      this.device = connected;
      this.serviceUuid = writable.serviceUUID;
      this.characteristicUuid = writable.uuid;
    } catch (error) {
      if (error instanceof PrinterError) {
        throw error;
      }
      throw new PrinterError('CONNECT_FAILED', (error as Error)?.message);
    }
  }

  private async findWritableCharacteristic(device: Device): Promise<Characteristic | null> {
    const services = await device.services();
    for (const service of services) {
      const characteristics = await service.characteristics();
      const writable = characteristics.find(
        (c) => c.isWritableWithoutResponse || c.isWritableWithResponse,
      );
      if (writable) {
        return writable;
      }
    }
    return null;
  }

  async write(bytes: Uint8Array): Promise<void> {
    const { device, serviceUuid, characteristicUuid } = this;
    if (!device || !serviceUuid || !characteristicUuid) {
      throw new PrinterError('WRITE_FAILED', 'Impressora não conectada.');
    }
    try {
      for (const chunk of chunkBytes(bytes, WRITE_CHUNK_SIZE)) {
        const value = bytesToBase64(chunk);
        await device.writeCharacteristicWithoutResponseForService(
          serviceUuid,
          characteristicUuid,
          value,
        );
      }
    } catch (error) {
      throw new PrinterError('WRITE_FAILED', (error as Error)?.message);
    }
  }

  async disconnect(): Promise<void> {
    const { device } = this;
    this.device = null;
    this.serviceUuid = null;
    this.characteristicUuid = null;
    if (!device) {
      return;
    }
    try {
      await this.getManager().cancelDeviceConnection(device.id);
    } catch {
      // Best-effort: a failed disconnect must never surface to the operator.
    }
  }
}
