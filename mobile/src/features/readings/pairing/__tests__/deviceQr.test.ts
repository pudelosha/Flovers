import { parseFloversQr } from '../deviceQr';
const qr = { version: 1, type: 'flovers-device', hardware_id: 'FACTORY_TEST_0001',
  name: 'FLOVERS_EST_0001', transport: 'ble', pop: 'P'.repeat(43) };
it('recognizes the factory QR without confusing it with a plant token', () => {
  expect(parseFloversQr(JSON.stringify(qr))).toEqual({ kind: 'device', device: qr });
  expect(parseFloversQr('PLANT_TOKEN_123')).toEqual({ kind: 'plant', token: 'PLANT_TOKEN_123' });
});
it.each([
  { ...qr, version: 2 }, { ...qr, transport: 'softap' }, { ...qr, pop: 'short' },
  { ...qr, name: 'OTHER_DEVICE' }, { ...qr, hardware_id: '../bad' },
  { ...qr, device_token: 'not-allowed' }, { ...qr, secret: 'not-allowed' },
  { ...qr, pop: '<script>'.repeat(8) }, null, ['invalid'],
])('rejects malformed, unsupported or credential-bearing QR %#', value => {
  expect(parseFloversQr(JSON.stringify(value))).toEqual({ kind: 'invalid' });
});
it.each(['https://flovers.app/?code=PLANT_123', 'https://www.flovers.app/?qr=PLANT_123',
  'flovers.app/?code=PLANT_123'])('preserves supported plant URL %s', raw => {
  expect(parseFloversQr(raw)).toEqual({ kind: 'plant', token: 'PLANT_123' });
});
it.each(['https://flovers.app.evil.test/?code=PLANT_123', 'https://evil.test/?qr=PLANT_123',
  'https://user:pass@flovers.app/?code=PLANT_123', 'https://flovers.app/?code=../not-a-token',
  'https://flovers.app/?code=short', '{bad json', 'a'.repeat(2050)])('rejects unsafe or invalid QR %s', raw => {
  expect(parseFloversQr(raw)).toEqual({ kind: 'invalid' });
});
it('accepts the explicitly configured development public host', () => {
  expect(parseFloversQr('https://local.test/?code=PLANT_123', 'https://local.test')).toEqual({ kind: 'plant', token: 'PLANT_123' });
});
