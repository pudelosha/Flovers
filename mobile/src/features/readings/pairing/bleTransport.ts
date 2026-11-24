import { PermissionsAndroid, Platform } from 'react-native';
import type { ESPDevice } from '@orbital-systems/react-native-esp-idf-provisioning';
import { PairingFailure, type BleReply, type PairingTransport } from './pairingController';
import type { DeviceQr } from './deviceQr';
let activeTransport: EspressifBleTransport | undefined;

/** Lazy native loading keeps legacy DIY and normal app startup independent of BLE. */
export class EspressifBleTransport implements PairingTransport {
  private device?: ESPDevice;
  private cancelled = false;
  private connecting = false;
  async connect(qr: DeviceQr) {
    if (activeTransport && activeTransport !== this) throw new PairingFailure('rejected');
    activeTransport = this; this.connecting = true;
    try {
    if (Platform.OS === 'android') {
      const permissions = Number(Platform.Version) >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const results = await PermissionsAndroid.requestMultiple(permissions);
      if (permissions.some(permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED)) throw new PairingFailure('permission');
    }
    if (this.cancelled) throw new PairingFailure('cancelled');
    const { ESPProvisionManager, ESPSecurity, ESPTransport } = require('@orbital-systems/react-native-esp-idf-provisioning') as typeof import('@orbital-systems/react-native-esp-idf-provisioning');
    const devices = await ESPProvisionManager.searchESPDevices(qr.name, ESPTransport.ble, ESPSecurity.secure);
    const matching = devices.filter(device => device.name === qr.name);
    if (this.cancelled) throw new PairingFailure('cancelled');
    if (matching.length !== 1) throw new PairingFailure('identity');
    this.device = matching[0];
    // Security 1 authenticates PoP using the official Espressif SDK. Never use SoftAP/provision().
    await this.device.connect(qr.pop);
    if (this.cancelled) { this.device.disconnect(); throw new PairingFailure('cancelled'); }
    // The SDK can otherwise negotiate security=0 or no_pop from untrusted metadata.
    const version = await this.device.getVersionInfo() as unknown as { prov?: { sec_ver?: number; cap?: string[] } };
    const capabilities = await this.device.getDeviceCapabilities();
    if (this.cancelled) throw new PairingFailure('cancelled');
    if (version?.prov?.sec_ver !== 1 || !Array.isArray(capabilities) || capabilities.includes('no_pop') ||
      version.prov.cap?.includes('no_pop') || await this.device.getSecurityType() !== ESPSecurity.secure) {
      throw new PairingFailure('rejected');
    }
    } finally {
      this.connecting = false;
      if (this.cancelled && activeTransport === this) activeTransport = undefined;
    }
  }
  async send(command: Record<string, unknown>): Promise<BleReply> {
    if (!this.device || this.cancelled) throw new PairingFailure('cancelled');
    const raw = await this.device.sendData('flovers-config', JSON.stringify(command));
    if (await this.device.getSecurityType() !== 1) throw new PairingFailure('rejected');
    if (raw.length > 2048) throw new PairingFailure('rejected');
    const response = JSON.parse(raw);
    if (typeof response?.hardware_id !== 'string' || typeof response.accepted !== 'boolean' ||
      typeof response.state !== 'string' || typeof response.in_progress !== 'boolean' ||
      !Number.isInteger(response.operation_id) || response.operation_id < 0 || response.operation_id > 0xffffffff ||
      !['none', 'pending', 'applied', 'failed'].includes(response.operation_state)) throw new PairingFailure('unsupported');
    return response;
  }
  disconnect() {
    this.cancelled = true; this.device?.disconnect();
    if (!this.connecting) { this.device = undefined; if (activeTransport === this) activeTransport = undefined; }
  }
}
