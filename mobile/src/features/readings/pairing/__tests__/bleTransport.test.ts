import { PermissionsAndroid, Platform } from 'react-native';
import { EspressifBleTransport } from '../bleTransport';
import type { DeviceQr } from '../deviceQr';
const mockDevice = { name: 'FLOVERS_EST_0001', connect: jest.fn(), sendData: jest.fn(), disconnect: jest.fn(),
  getVersionInfo: jest.fn(), getDeviceCapabilities: jest.fn(), getSecurityType: jest.fn() };
const mockSearch = jest.fn();
jest.mock('@orbital-systems/react-native-esp-idf-provisioning', () => ({
  ESPProvisionManager: { searchESPDevices: (...args: unknown[]) => mockSearch(...args) },
  ESPSecurity: { secure: 1 }, ESPTransport: { ble: 'ble' },
}));
const qr: DeviceQr = { version: 1, type: 'flovers-device', hardware_id: 'FACTORY_TEST_0001',
  name: 'FLOVERS_EST_0001', transport: 'ble', pop: 'P'.repeat(43) };
let version: number | string;
beforeEach(() => {
  jest.clearAllMocks(); version = Platform.Version;
  jest.replaceProperty(Platform, 'OS', 'android');
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 34 });
  mockSearch.mockResolvedValue([mockDevice]); mockDevice.connect.mockResolvedValue(undefined);
  mockDevice.getVersionInfo.mockResolvedValue({ prov: { sec_ver: 1 } });
  mockDevice.getDeviceCapabilities.mockResolvedValue([]); mockDevice.getSecurityType.mockResolvedValue(1);
  mockDevice.sendData.mockResolvedValue(JSON.stringify({ hardware_id: qr.hardware_id, accepted: true, state: 'queued', in_progress: true,
    operation_id: 42, operation_state: 'pending' }));
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockImplementation(async permissions =>
    Object.fromEntries(permissions.map(p => [p, 'granted'])) as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
});
afterEach(() => { jest.restoreAllMocks(); Object.defineProperty(Platform, 'Version', { configurable: true, value: version }); });
it('uses BLE Security 1, the scanned PoP and only the custom encrypted endpoint', async () => {
  const ble = new EspressifBleTransport();
  try {
    await ble.connect(qr); await ble.send({ action: 'status' });
    expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith(['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT']);
    expect(mockSearch).toHaveBeenCalledWith(qr.name, 'ble', 1);
    expect(mockDevice.connect).toHaveBeenCalledWith(qr.pop);
    expect(mockDevice.sendData).toHaveBeenCalledWith('flovers-config', '{"action":"status"}');
  } finally { ble.disconnect(); }
});
it('requests location permission only on older Android versions', async () => {
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 30 });
  const ble = new EspressifBleTransport();
  try { await ble.connect(qr); expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith(['android.permission.ACCESS_FINE_LOCATION']); }
  finally { ble.disconnect(); }
});
it('does not scan after Bluetooth permission is denied', async () => {
  jest.mocked(PermissionsAndroid.requestMultiple).mockResolvedValue({} as any);
  const ble = new EspressifBleTransport();
  try { await expect(ble.connect(qr)).rejects.toMatchObject({ code: 'permission' }); expect(mockSearch).not.toHaveBeenCalled(); }
  finally { ble.disconnect(); }
});
it('rejects ambiguous advertisements rather than selecting the first', async () => {
  mockSearch.mockResolvedValue([mockDevice, mockDevice]);
  const ble = new EspressifBleTransport();
  try { await expect(ble.connect(qr)).rejects.toMatchObject({ code: 'identity' }); expect(mockDevice.connect).not.toHaveBeenCalled(); }
  finally { ble.disconnect(); }
});
it('blocks a new native operation until a cancelled connection settles', async () => {
  let finish!: () => void;
  mockDevice.connect.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  const first = new EspressifBleTransport(); const second = new EspressifBleTransport();
  const connecting = first.connect(qr).catch(error => error);
  for (let i = 0; i < 10 && !mockDevice.connect.mock.calls.length; i++) await Promise.resolve();
  expect(mockDevice.connect).toHaveBeenCalled();
  first.disconnect();
  await expect(second.connect(qr)).rejects.toMatchObject({ code: 'rejected' });
  finish(); expect(await connecting).toMatchObject({ code: 'cancelled' });
  mockDevice.connect.mockResolvedValue(undefined);
  try { await second.connect(qr); } finally { second.disconnect(); }
});
it.each([0, 2, undefined])('rejects security downgrade/mismatch %s before sending credentials', async security => {
  mockDevice.getVersionInfo.mockResolvedValue({ prov: { sec_ver: security } });
  const ble = new EspressifBleTransport();
  try { await expect(ble.connect(qr)).rejects.toMatchObject({ code: 'rejected' }); expect(mockDevice.sendData).not.toHaveBeenCalled(); }
  finally { ble.disconnect(); }
});
it('rejects unauthenticated Security 1 no_pop', async () => {
  mockDevice.getDeviceCapabilities.mockResolvedValue(['no_pop']);
  const ble = new EspressifBleTransport();
  try { await expect(ble.connect(qr)).rejects.toMatchObject({ code: 'rejected' }); expect(mockDevice.sendData).not.toHaveBeenCalled(); }
  finally { ble.disconnect(); }
});
