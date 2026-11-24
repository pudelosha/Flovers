/* Real current + byte-identical previous adapters. Only fetch/config are substituted. */
const fs = require('fs');
const path = require('path');
const {verify, spec} = require('./bundle.cjs');
if (!process.env.CONTRACT_BUNDLE) throw new Error('Run the provider suite first; no fallback mocks');
const bundle = verify(JSON.parse(fs.readFileSync(process.env.CONTRACT_BUNDLE, 'utf8')), process.env.CONTRACT_PROVIDER_SHA);
const clients = {
  current: path.resolve(__dirname, '../../mobile/src/api'),
  previous: path.resolve(__dirname, 'previous/api'),
};
class TestFormData {
  constructor() { this.parts = {}; }
  append(key, value) { this.parts[key] = value; }
}
global.FormData = TestFormData;
const originalFetch = global.fetch;
afterAll(() => { global.fetch = originalFetch; });

function replay(caseSpec, evidence, client) {
  const remaining = [...evidence.exchanges];
  global.fetch = jest.fn(async (raw, init) => {
    const url = new URL(raw);
    expect(url.origin).toBe('http://testserver');
    const query = Object.fromEntries(url.searchParams);
    const found = remaining.findIndex(e => e.request.method === init.method &&
      e.request.path === url.pathname && JSON.stringify(Object.entries(e.request.query).sort()) === JSON.stringify(Object.entries(query).sort()));
    if (found < 0) throw new Error(`Unverified request: ${init.method} ${url.pathname}${url.search}`);
    const e = remaining.splice(found, 1)[0];
    expect(init.headers.Authorization).toBe(caseSpec.request.actor === 'anonymous' ? undefined : 'Bearer contract-test-only');
    if (e.request.multipart) {
      expect(init.body).toBeInstanceOf(TestFormData);
      const {photo, ...values} = init.body.parts;
      expect(photo.type).toBe('image/jpeg');
      expect(values).toEqual(e.request.body);
    } else {
      expect(init.body ? JSON.parse(init.body) : null).toEqual(e.request.body);
    }
    const response = e.response;
    return {ok: response.status >= 200 && response.status < 300, status: response.status,
      headers: {get: key => response.headers[key.toLowerCase()] || null},
      text: async () => JSON.stringify(response.body),
      blob: async () => ({size: response.body.bytes, type: response.headers['content-type']}),
    };
  });
  client.configureTokenRefresh(null);
  client.setAuthToken(caseSpec.request.actor === 'anonymous' ? null : 'contract-test-only');
  return () => expect(remaining).toEqual([]);
}

async function execute(c, edition, api) {
  const service = name => require(path.join(clients[edition], 'services', `${name}.service.ts`));
  const args = Object.fromEntries(new URL(c.request.path, 'http://testserver').searchParams);
  const body = c.request.body;
  switch (c.operation) {
    case 'identity': return service('device-pairing').devicePairingApi.identity(601);
    case 'pairing-start': return service('device-pairing').devicePairingApi.start(body.device_id, body.hardware_id, body.replaces_hardware_id);
    case 'pairing-status': case 'pairing-cancel': {
      const id = bundle.cases[c.id].exchanges[0].request.path.split('/')[3];
      return service('device-pairing').devicePairingApi[c.operation === 'pairing-status' ? 'status' : 'cancel'](id);
    }
    case 'iot-pair-flow': {
      const {PairingController} = require('../../mobile/src/features/readings/pairing/pairingController.ts');
      const qr = {version: 1, type: 'flovers-device', hardware_id: 'CONTRACT_BOARD_0001',
        name: 'FLOVERS_ARD_0001', transport: 'ble', pop: 'S'.repeat(43)};
      const ble = {connect: jest.fn(async () => {}), disconnect: jest.fn(), send: jest.fn(async command => ({
        hardware_id: qr.hardware_id, accepted: command.action === 'pair', state: 'queued',
        in_progress: false, operation_id: 1, operation_state: 'pending',
      }))};
      const progress = jest.fn();
      const controller = new PairingController(service('device-pairing').devicePairingApi, ble, {timeoutMs: 2000, pollMs: 1});
      // Replay at the same frozen clock as Django; do not disable expiry validation.
      const session = bundle.cases[c.id].exchanges[1].response.body;
      const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.parse(session.expires_at) - 600000);
      let result;
      try {
        result = await controller.run({deviceId: 601, qr, mode: 'pair', ssid: 'synthetic-network',
          password: 'synthetic-password', replacementConfirmed: false}, progress);
      } finally { clock.mockRestore(); }
      expect(progress.mock.calls.flat()).toEqual(['connecting', 'sending', 'verifying', 'complete']);
      expect(ble.send).toHaveBeenCalledWith(expect.objectContaining({action: 'pair', session_id: expect.any(String),
        claim: expect.any(String), proof_payload: expect.any(String)}));
      expect(ble.disconnect).toHaveBeenCalledTimes(1);
      expect(result.synchronization).toBe('applied');
      return result;
    }
    case 'complete': return service('home').markHomeTaskComplete('401', body?.note, body?.completedDate);
    case 'progression': return service('profile').fetchProfileProgression();
    case 'plant': case 'photo': {
      const result = await service('plant-instances').fetchPlantInstanceDetail(201);
      if (c.operation === 'photo') {
        const photo = service('plant-photos').parsePlantPhoto(result.photo);
        expect(photo).not.toBeNull();
        expect(photo.framing).toEqual({focal_x: 0.4, focal_y: 0.6, zoom: 1.5});
      }
      return result;
    }
    case 'bytes': return api.requestBlob(bundle.cases[c.id].exchanges[0].request.path, {auth: true});
    case 'photo-replace': return service('plant-photos').uploadPlantPhoto('201', 'file:///synthetic.jpg', {
      expectedPhotoId: null, uploadKey: '00000000-0000-4000-8000-000000000803',
    });
    case 'cover-upload': return service('plant-photos').uploadPlantPhoto('201', 'file:///synthetic.jpg', {
      expectedPhotoId: null, uploadKey: body.upload_key, framing: JSON.parse(body.framing),
    });
    case 'reframe': return service('plant-photos').updatePlantPhotoFraming('201', body.framing, {
      expectedPhotoId: bundle.cases[c.id].exchanges[0].request.body.expected_photo_id,
      expectedFramingRevision: body.expected_framing_revision,
    });
    case 'journal-create': return service('journal-photos').createJournalPhoto('201', 'file:///synthetic.jpg', body.upload_key, {
      notes: body.notes, taken_on: null, framing: JSON.parse(body.framing),
    });
    case 'journal-edit': return service('journal-photos').updateJournalPhoto({id: '00000000-0000-4000-8000-000000000501', revision: 0}, {
      notes: body.notes, taken_on: body.taken_on, framing: body.framing,
    });
    case 'journal': {
      const query = {};
      if (args.plantId) query.plantId = args.plantId;
      if (args.types) query.types = args.types.split(',');
      const first = await service('history').fetchJournalPage(query, args.cursor);
      if (c.id === 'journal-pagination') {
        expect(first.items).toHaveLength(30);
        const next = await service('history').fetchJournalPage(query, first.nextCursor);
        expect(next.nextCursor).toBeNull();
        expect(new Set([...first.items, ...next.items].map(i => `${i.type}:${i.id}`)).size).toBe(32);
      }
      if (c.id === 'journal-mixed') {
        expect(first.items.map(i => i.type).sort()).toEqual(['photo', 'watering']);
        expect(first.items.every(i => i.plant === 'Contract fern')).toBe(true);
      }
      return first;
    }
    case 'preview': return c.id.endsWith('navigation') ? service('journal-photos').fetchJournalPhotoPreview('00000000-0000-4000-8000-000000000501') : service('journal-photos').fetchJournalPhoto('00000000-0000-4000-8000-000000000501');
    case 'history': return service('history').fetchHistoryItems();
    case 'sharing': return service('sharing').fetchSharing();
    case 'share-update': return service('sharing').updatePlantSharing(body.updates.map(u => ({
      plant: {id: String(u.plant_id)}, expectedRevision: u.expected_revision,
      recipients: u.recipients.map(r => ({contactId: r.contact_id, canCompleteTasks: r.can_complete_tasks, endsOn: r.ends_on})),
    })), {});
    case 'device': {
      const device = await service('readings').getReadingDevice(601);
      const tile = service('readings').toReadingTile(device);
      if (edition === 'current') expect(tile.intervalMinutes).toBe(c.setup === 'hours' ? 120 : 60);
      if (c.setup === 'zero') expect(tile.metrics.moisture).toBe(0);
      if (c.setup === 'missing') expect(tile.metrics.moisture).toBeNull();
      return device;
    }
    case 'device-update': return service('readings').updateReadingDevice(601, body);
    case 'pump': return service('readings').schedulePumpWatering(601, {auth: true, ...(body ? {durationSeconds: body.duration_seconds} : {})});
    case 'reading-history': return service('readings').fetchReadingsHistory({
      deviceId: 601, range: args.range, metric: args.metric, stat: args.stat, anchor: args.anchor,
    });
    case 'contacts': return service('contacts').fetchContacts();
    case 'invite': return service('contacts').sendEmailInvitation(body.email, body.language);
    case 'invite-cancel': return service('contacts').dismissContactInvitation('email:701');
    case 'contact-invite': return service('contacts').sendContactInvitation(body.identifier);
    default: throw new Error(`Unimplemented consumer operation: ${c.operation}`);
  }
}

for (const edition of Object.keys(clients)) {
  describe(`${edition} mobile API`, () => {
    for (const c of spec.scenarios.filter(s => s.clients.includes(edition))) {
      test(c.id, async () => {
        const api = require(path.join(clients[edition], 'client.ts'));
        const finish = replay(c, bundle.cases[c.id], api);
        if (c.error) {
          const failure = await execute(c, edition, api).then(() => null, e => e);
          expect(failure).toBeInstanceOf(Error);
          if (['contacts','invite','invite-cancel','contact-invite','sharing','share-update'].includes(c.operation)) {
            expect(failure.reason).toBe(c.expect.code || (c.error === 404 ? 'notFound' : 'unavailable'));
          } else {
            expect(failure.status).toBe(c.error);
            if (c.id.endsWith('-expired-token') || c.id.endsWith('-revoked-access')) {
              expect(failure.body).toEqual(bundle.cases[c.id].exchanges[0].response.body);
            }
          }
        } else {
          const result = await execute(c, edition, api);
          const wire = bundle.cases[c.id].exchanges[0].response.body;
          if (c.operation === 'complete') {
            if (edition === 'previous') expect(result).toBeUndefined();
            else expect(result).toEqual({
              xpGained: wire.xp_awarded,
              levelUp: wire.level_up ? {
                previousLevel: wire.level_up.previous_level,
                level: wire.level_up.level,
              } : null,
            });
          }
          if (c.operation === 'progression') expect(result).toEqual(wire.data);
          if (['device-update','pump','reading-history','plant','identity','pairing-start','pairing-status','pairing-cancel'].includes(c.operation)) expect(result).toEqual(wire);
          if (c.operation === 'contacts') expect(result.counts.contacts).toBe(wire.data.contacts.length);
          if (c.operation === 'history') expect(result[0]).toMatchObject({plant: 'Contract fern', type: 'watering'});
        }
        finish();
      });
    }
  });
}
