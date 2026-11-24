import { configurationApplied, type devicePairingApi, type DeviceIdentity } from '../../../api/services/device-pairing.service';
import type { DeviceQr } from './deviceQr';

export type PairingMode = 'pair' | 'wifi' | 'replace';
export type PairingStage = 'connecting' | 'sending' | 'verifying' | 'complete';
export class PairingFailure extends Error {
  constructor(public readonly code: 'cancelled' | 'timeout' | 'identity' | 'rejected' | 'expired' | 'network' | 'permission' | 'unsupported') {
    super(code); // Never surface native/provider messages containing credentials.
  }
}
export type BleReply = { hardware_id: string; accepted: boolean; state: string; in_progress?: boolean;
  operation_id?: number; operation_state?: 'none' | 'pending' | 'applied' | 'failed' };
export type PairingTransport = {
  connect(qr: DeviceQr): Promise<void>;
  send(command: Record<string, unknown>): Promise<BleReply>;
  disconnect(): void;
};
export function validWifi(ssid: string, password: string) {
  const bytes = (text: string) => {
    try { return encodeURIComponent(text).replace(/%[0-9A-F]{2}/g, 'x').length; }
    catch { return Infinity; } // An incomplete IME surrogate must not crash the form.
  };
  return !/[\u0000-\u001f\u007f]/.test(ssid + password) && bytes(ssid) >= 1 && bytes(ssid) <= 32 &&
    (password === '' || (bytes(password) >= 8 && bytes(password) <= 63) || /^[a-fA-F0-9]{64}$/.test(password));
}

/** One operation per instance. Native work and server claims are bounded and never persisted. */
export class PairingController {
  private stopped = false;
  private started = false;
  private session?: string;
  private deadline = 0;
  private wake?: () => void;
  private cancellation?: Promise<boolean>;
  constructor(private api: Pick<typeof devicePairingApi, 'identity' | 'start' | 'status' | 'cancel'>, private ble: PairingTransport,
    private timing = { timeoutMs: 150000, pollMs: 1800 }) {}

  private check() {
    if (this.stopped) throw new PairingFailure('cancelled');
    if (Date.now() >= this.deadline) throw new PairingFailure('timeout');
  }
  private async bounded<T>(operation: Promise<T>): Promise<T> {
    this.check();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation, new Promise<never>((_, reject) => {
        this.wake = () => reject(new PairingFailure('cancelled'));
        timer = setTimeout(() => reject(new PairingFailure('timeout')), Math.max(1, this.deadline - Date.now()));
      })]);
    } finally { clearTimeout(timer); this.wake = undefined; }
  }
  /** False means the server may have bound already or is unreachable: do not claim revocation. */
  cancel(): Promise<boolean> {
    this.stopped = true; this.wake?.(); this.ble.disconnect();
    if (!this.cancellation) this.cancellation = this.session
      ? this.api.cancel(this.session).then(result => result.status === 'cancelled', () => false)
      : Promise.resolve(false);
    return this.cancellation;
  }
  async run(input: { deviceId: number; qr: DeviceQr; mode: PairingMode; ssid: string; password: string;
    replacementConfirmed: boolean }, progress: (stage: PairingStage) => void): Promise<DeviceIdentity> {
    if (this.started) throw new PairingFailure('rejected');
    this.started = true; this.deadline = Date.now() + this.timing.timeoutMs;
    const { qr, mode, deviceId, ssid, password } = input;
    if (!validWifi(ssid, password)) throw new PairingFailure('rejected');
    try {
      const identity = await this.bounded(this.api.identity(deviceId)); this.check();
      if (mode === 'wifi' && (identity.pairing !== 'paired' || identity.hardware_id !== qr.hardware_id)) throw new PairingFailure('identity');
      if (mode === 'pair' && identity.pairing === 'paired') throw new PairingFailure('identity');
      if (mode === 'replace' && (!input.replacementConfirmed || identity.pairing !== 'paired' ||
        !identity.hardware_id || identity.hardware_id === qr.hardware_id)) throw new PairingFailure('identity');
      progress('connecting');
      await this.bounded(this.ble.connect(qr)); this.check();
      const board = await this.bounded(this.ble.send({ action: 'status' })); this.check();
      if (board.hardware_id !== qr.hardware_id) throw new PairingFailure('identity');
      if (board.in_progress !== false) throw new PairingFailure('unsupported');
      let command: Record<string, unknown> = { action: 'wifi', ssid, password };
      if (mode !== 'wifi') {
        // If cancellation races POST, cancel the late session when it eventually arrives.
        const session = await this.bounded(this.api.start(deviceId, qr.hardware_id,
          mode === 'replace' ? identity.hardware_id : undefined).then(result => {
            this.session = result.session_id;
            if (this.stopped) void this.api.cancel(result.session_id).catch(() => undefined);
            return result;
          }));
        this.check();
        if (session.protocol !== 'flovers-pair-v1' || !Number.isFinite(Date.parse(session.expires_at)) ||
          Date.parse(session.expires_at) <= Date.now()) throw new PairingFailure('expired');
        command = { action: 'pair', ssid, password, session_id: session.session_id,
          claim: session.claim, proof_payload: session.proof_payload };
      }
      progress('sending');
      const queued = await this.bounded(this.ble.send(command)); this.check();
      if (queued.hardware_id !== qr.hardware_id || !queued.accepted) throw new PairingFailure('rejected');
      if (!Number.isInteger(queued.operation_id) || Number(queued.operation_id) < 1) throw new PairingFailure('unsupported');
      progress('verifying');
      while (true) {
        this.check();
        // Pairing success is exclusively backend evidence, not Wi-Fi/BLE connection state.
        const result = this.session ? await this.bounded(this.api.status(this.session)) : undefined;
        this.check();
        if (result && ['expired', 'cancelled'].includes(result.status)) throw new PairingFailure('expired');
        const current = result?.device ?? await this.bounded(this.api.identity(deviceId)); this.check();
        if (current.synchronization === 'rejected' || current.pairing === 'revoked') throw new PairingFailure('rejected');
        const verified = current.hardware_id === qr.hardware_id && current.online === true && configurationApplied(current);
        if (mode === 'wifi') {
          const reply = await this.bounded(this.ble.send({ action: 'status' })); this.check();
          if (reply.hardware_id !== qr.hardware_id) throw new PairingFailure('identity');
          if (reply.operation_id !== queued.operation_id || reply.operation_state === 'failed') throw new PairingFailure('rejected');
          if (reply.in_progress === false && reply.operation_state === 'applied' && verified &&
            current.last_config_sync_at !== identity.last_config_sync_at) { progress('complete'); return current; }
        } else if (result?.status === 'confirmed' && verified) { progress('complete'); return current; }
        await this.bounded(new Promise<void>(resolve => setTimeout(resolve, this.timing.pollMs)));
      }
    } catch (error) {
      this.stopped = true;
      if (this.session) await this.api.cancel(this.session).catch(() => undefined);
      if (error instanceof PairingFailure) throw error;
      throw new PairingFailure((error as { status?: number })?.status === 404 ? 'unsupported' : 'network');
    } finally { this.ble.disconnect(); }
  }
}
