/** Factory PoP is a short-lived in-memory secret: never persist or display raw QR data. */
export type DeviceQr = {
  version: 1; type: 'flovers-device'; hardware_id: string;
  name: string; transport: 'ble'; pop: string;
};
export type ScannedQr = { kind: 'device'; device: DeviceQr } | { kind: 'plant'; token: string } | { kind: 'invalid' };
export function parseFloversQr(raw: string, publicBase = ''): ScannedQr {
  if (raw.length > 2048) return { kind: 'invalid' };
  const tokenPattern = /^[A-Za-z0-9_-]{8,64}$/;
  if (raw.startsWith('{')) {
    try {
      const qr = JSON.parse(raw);
      if (!qr || Object.keys(qr).sort().join(',') !== 'hardware_id,name,pop,transport,type,version' ||
        qr.version !== 1 || qr.type !== 'flovers-device' || qr.transport !== 'ble' ||
        typeof qr.hardware_id !== 'string' || !tokenPattern.test(qr.hardware_id) ||
        qr.name !== `FLOVERS_${qr.hardware_id.slice(-8)}` ||
        typeof qr.pop !== 'string' || !/^[A-Za-z0-9_-]{32,64}$/.test(qr.pop)) return { kind: 'invalid' };
      return { kind: 'device', device: qr };
    } catch { return { kind: 'invalid' }; }
  }
  if (tokenPattern.test(raw)) return { kind: 'plant', token: raw };
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    let configuredHost = '';
    try { configuredHost = new URL(publicBase).hostname; } catch {}
    const trusted = url.hostname === 'flovers.app' || url.hostname.endsWith('.flovers.app') ||
      (!!configuredHost && url.hostname === configuredHost);
    const token = url.searchParams.get('code') || url.searchParams.get('qr') || '';
    if (trusted && !url.username && !url.password && ['https:', 'http:'].includes(url.protocol) && tokenPattern.test(token)) {
      return { kind: 'plant', token };
    }
  } catch {}
  return { kind: 'invalid' };
}
