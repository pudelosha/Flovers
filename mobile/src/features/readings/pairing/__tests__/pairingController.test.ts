import { PairingController, PairingFailure, validWifi } from '../pairingController';
import { configurationApplied, type DeviceIdentity, type PairingSession } from '../../../../api/services/device-pairing.service';
import type { DeviceQr } from '../deviceQr';
const qr: DeviceQr = { version: 1, type: 'flovers-device', hardware_id: 'FACTORY_TEST_0001',
  name: 'FLOVERS_EST_0001', transport: 'ble', pop: 'P'.repeat(43) };
const idle: DeviceIdentity = { pairing: 'legacy-or-not-paired', synchronization: 'unknown' };
const ready: DeviceIdentity = { pairing: 'paired', hardware_id: qr.hardware_id, online: true,
  synchronization: 'applied', desired_config_version: 2, applied_config_version: 2, last_config_sync_at: 'new' };
const session: PairingSession = { session_id: 'synthetic-session', claim: 'synthetic-claim', proof_payload: 'synthetic-proof',
  expires_at: '2099-01-01T00:00:00Z', protocol: 'flovers-pair-v1' };
const reply = { hardware_id: qr.hardware_id, accepted: true, state: 'configured', in_progress: false,
  operation_id: 42, operation_state: 'applied' };
function fixture() {
  const api = { identity: jest.fn().mockResolvedValue(idle), start: jest.fn().mockResolvedValue(session),
    status: jest.fn().mockResolvedValue({ status: 'confirmed', device: ready }),
    cancel: jest.fn().mockResolvedValue({ status: 'cancelled' }) };
  const ble = { connect: jest.fn().mockResolvedValue(undefined), send: jest.fn().mockResolvedValue(reply), disconnect: jest.fn() };
  const controller = new PairingController(api, ble, { timeoutMs: 200, pollMs: 1 });
  return { api, ble, controller, progress: jest.fn(), input: { deviceId: 12, qr, mode: 'pair' as const,
    ssid: 'Synthetic WiFi', password: 'synthetic-password', replacementConfirmed: false } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
it('sends the authenticated claim via BLE and completes only on confirmed, applied backend evidence', async () => {
  const f = fixture();
  expect(await f.controller.run(f.input, f.progress)).toEqual(ready);
  expect(f.api.start).toHaveBeenCalledWith(12, qr.hardware_id, undefined);
  expect(f.ble.send).toHaveBeenCalledWith({ action: 'pair', ssid: f.input.ssid, password: f.input.password,
    session_id: session.session_id, claim: session.claim, proof_payload: session.proof_payload });
  expect(f.progress.mock.calls.flat()).toEqual(['connecting', 'sending', 'verifying', 'complete']);
  expect(f.ble.disconnect).toHaveBeenCalled();
  expect(f.api.cancel).not.toHaveBeenCalled();
});
it.each([
  { status: 'bound', device: ready },
  { status: 'confirmed', device: { ...ready, synchronization: 'pending' } },
  { status: 'confirmed', device: { ...ready, applied_config_version: 1 } },
  { status: 'confirmed', device: { ...ready, online: false } },
])('does not claim success prematurely %#', async first => {
  const f = fixture(); f.api.status.mockResolvedValueOnce(first);
  await f.controller.run(f.input, f.progress);
  expect(f.api.status).toHaveBeenCalledTimes(2);
});
it.each(['expired', 'cancelled'])('stops on server %s session', async status => {
  const f = fixture(); f.api.status.mockResolvedValue({ status, device: idle });
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'expired' });
  expect(f.progress).not.toHaveBeenCalledWith('complete');
});
it('rejects hardware mismatch before transmitting Wi-Fi or creating a session', async () => {
  const f = fixture(); f.ble.send.mockResolvedValue({ ...reply, hardware_id: 'OTHER_BOARD' });
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'identity' });
  expect(f.api.start).not.toHaveBeenCalled();
  expect(f.ble.send).toHaveBeenCalledTimes(1);
});
it('requires updated firmware operation status', async () => {
  const f = fixture(); f.ble.send.mockResolvedValue({ ...reply, in_progress: undefined });
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'unsupported' });
  expect(f.api.start).not.toHaveBeenCalled();
});
it('requires owner-confirmed replacement and pins the prior identity', async () => {
  const f = fixture(); f.api.identity.mockResolvedValue({ ...ready, hardware_id: 'PREVIOUS_BOARD' });
  await f.controller.run({ ...f.input, mode: 'replace', replacementConfirmed: true }, f.progress);
  expect(f.api.start).toHaveBeenCalledWith(12, qr.hardware_id, 'PREVIOUS_BOARD');
  const blocked = fixture(); blocked.api.identity.mockResolvedValue(ready);
  await expect(blocked.controller.run({ ...blocked.input, mode: 'replace' }, blocked.progress)).rejects.toBeInstanceOf(PairingFailure);
  expect(blocked.ble.connect).not.toHaveBeenCalled();
});
it('Wi-Fi change does not replace the binding and requires a fresh applied acknowledgement', async () => {
  const f = fixture(); f.api.identity.mockResolvedValueOnce({ ...ready, last_config_sync_at: 'old' }).mockResolvedValue(ready);
  f.ble.send.mockResolvedValueOnce(reply).mockResolvedValueOnce({ ...reply, in_progress: true })
    .mockResolvedValueOnce({ ...reply, in_progress: true }).mockResolvedValue(reply);
  await f.controller.run({ ...f.input, mode: 'wifi' }, f.progress);
  expect(f.api.start).not.toHaveBeenCalled(); expect(f.api.status).not.toHaveBeenCalled();
  expect(f.ble.send).toHaveBeenCalledWith({ action: 'wifi', ssid: f.input.ssid, password: f.input.password });
  expect(f.api.identity).toHaveBeenCalledTimes(3);
});
it.each([{ operation_id: 99, operation_state: 'applied' }, { operation_id: 42, operation_state: 'failed' }])(
  'does not mistake a restored old Wi-Fi connection or another command for success %#', async result => {
    const f = fixture(); f.api.identity.mockResolvedValueOnce({ ...ready, last_config_sync_at: 'old' }).mockResolvedValue(ready);
    f.ble.send.mockResolvedValueOnce(reply).mockResolvedValueOnce(reply).mockResolvedValue({ ...reply, ...result });
    await expect(f.controller.run({ ...f.input, mode: 'wifi' }, f.progress)).rejects.toMatchObject({ code: 'rejected' });
    expect(f.progress).not.toHaveBeenCalledWith('complete');
  });
it('does not falsely cancel a bound operation or report it complete after closing', async () => {
  const f = fixture(); const pending = deferred<any>();
  f.api.status.mockReturnValue(pending.promise); f.api.cancel.mockRejectedValue({ status: 409 });
  const run = f.controller.run(f.input, f.progress).catch(error => error);
  while (!f.api.status.mock.calls.length) await Promise.resolve();
  expect(await f.controller.cancel()).toBe(false);
  pending.resolve({ status: 'confirmed', device: ready });
  expect(await run).toMatchObject({ code: 'cancelled' });
  expect(f.progress).not.toHaveBeenCalledWith('complete');
});
it('cancels a claim arriving after cancellation without sending credentials', async () => {
  const f = fixture(); const pending = deferred<PairingSession>(); f.api.start.mockReturnValue(pending.promise);
  const run = f.controller.run(f.input, f.progress).catch(error => error);
  while (!f.api.start.mock.calls.length) await Promise.resolve();
  await f.controller.cancel(); pending.resolve(session); await run; await Promise.resolve();
  expect(f.api.cancel).toHaveBeenCalledWith(session.session_id);
  expect(f.ble.send).toHaveBeenCalledTimes(1);
});
it('bounds stalled operations and always disconnects', async () => {
  const f = fixture(); f.ble.connect.mockReturnValue(new Promise(() => {}));
  const controller = new PairingController(f.api, f.ble, { timeoutMs: 5, pollMs: 1 });
  await expect(controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'timeout' });
  expect(f.ble.disconnect).toHaveBeenCalled();
});
it('does not expose a native error containing Wi-Fi or PoP', async () => {
  const f = fixture(); f.ble.connect.mockRejectedValue(new Error(`secret=${f.input.password};pop=${qr.pop}`));
  await expect(f.controller.run(f.input, f.progress)).rejects.toEqual(new PairingFailure('network'));
});
it('handles unavailable old backend before attempting BLE', async () => {
  const f = fixture(); f.api.identity.mockRejectedValue({ status: 404 });
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'unsupported' });
  expect(f.ble.connect).not.toHaveBeenCalled();
});
it('does not call shared-user protected operations after an authorization error', async () => {
  const f = fixture(); f.api.identity.mockRejectedValue({ status: 403 });
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'network' });
  expect(f.api.start).not.toHaveBeenCalled(); expect(f.ble.connect).not.toHaveBeenCalled();
});
it('does not accept rejected configuration', async () => {
  const f = fixture(); f.api.status.mockResolvedValue({ status: 'confirmed', device: { ...ready, synchronization: 'rejected' } });
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'rejected' });
});
it('does not run a controller twice', async () => {
  const f = fixture(); await f.controller.run(f.input, f.progress);
  await expect(f.controller.run(f.input, f.progress)).rejects.toMatchObject({ code: 'rejected' });
});
it.each([['', '12345678'], ['wifi', 'short'], ['x'.repeat(33), '12345678'], ['wifi', '\n12345678']])('rejects invalid Wi-Fi input %#', (ssid, password) => {
  expect(validWifi(ssid, password)).toBe(false);
});
it('supports UTF-8 SSIDs and open networks within firmware byte limits', () => {
  expect(validWifi('Moja sieć', '')).toBe(true);
  expect(validWifi('ą'.repeat(17), '12345678')).toBe(false);
  expect(validWifi('\ud800', '')).toBe(false);
  expect(configurationApplied({ ...ready, desired_config_version: undefined })).toBe(false);
});
