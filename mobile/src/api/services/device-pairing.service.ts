import { request } from '../client';

export type DeviceIdentity = {
  pairing: 'legacy-or-not-paired' | 'paired' | 'revoked';
  synchronization: 'unknown' | 'pending' | 'applied' | 'rejected';
  hardware_id?: string; firmware_version?: string | null; last_seen_at?: string | null;
  online?: boolean; desired_config_version?: number; applied_config_version?: number;
  config_error?: string | null; last_config_sync_at?: string | null;
};
export type PairingSession = {
  session_id: string; claim: string; proof_payload: string; expires_at: string;
  protocol: 'flovers-pair-v1';
};
export type PairingResult = {
  session_id: string; status: 'pending' | 'bound' | 'confirmed' | 'cancelled' | 'expired';
  expires_at: string; device: DeviceIdentity;
};
const options = { auth: true, timeoutMs: 15000 };
export const devicePairingApi = {
  identity: (id: number) => request<DeviceIdentity>(`/readings/devices/${id}/identity/`, 'GET', undefined, options),
  revoke: (id: number) => request<void>(`/readings/devices/${id}/identity/`, 'DELETE', undefined, options),
  start: (deviceId: number, hardwareId: string, replacesHardwareId?: string) => request<PairingSession>(
    '/readings/pairing/', 'POST', { device_id: deviceId, hardware_id: hardwareId,
      ...(replacesHardwareId ? { replaces_hardware_id: replacesHardwareId } : {}) }, options),
  status: (id: string) => request<PairingResult>(`/readings/pairing/${encodeURIComponent(id)}/`, 'GET', undefined, options),
  cancel: (id: string) => request<PairingResult>(`/readings/pairing/${encodeURIComponent(id)}/`, 'DELETE', undefined, options),
};
export function configurationApplied(identity: DeviceIdentity) {
  return identity.pairing === 'paired' && identity.synchronization === 'applied' &&
    Number.isInteger(identity.desired_config_version) && Number(identity.desired_config_version) > 0 &&
    identity.applied_config_version === identity.desired_config_version;
}
