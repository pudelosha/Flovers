# Provider-verified API compatibility (P0-C2)

This lane verifies actual Django/DRF responses, then replays **the same responses**
through the real mobile HTTP clients and API adapters. It does not substitute
independently maintained response mocks or change application behavior.

## Evidence flow

`scenarios.json` is the shared contract matrix: requests, roles, setup and explicit
provider expectations. Provider tests use real routes, JWT authentication, DRF
validation, database models, permissions, pagination and photo processing/storage.
They also check persisted completion, invitation outbox and pagination effects.
Only the wall clock, synthetic inputs and external I/O boundaries are isolated.

The provider exports `provider.json` **only after every required scenario passed**.
It contains the exact provider commit, specification digest, previous-client commit,
requests, HTTP statuses/headers/bodies and per-response canonical JSON/digests.
The consumer job depends on provider success and downloads this run/attempt's
artifact. Missing, stale, incomplete, changed or unsuccessful evidence fails closed.
Checksums provide integrity/provenance checks within the trusted CI run; they are
not cryptographic attestations from an external signing authority.

Consumers call real adapters with `fetch` substituted at the HTTP boundary. Every
method, path, query, JSON/multipart payload and authentication header must match
a provider-verified request. Unexpected requests, unused responses, wrong DTOs or
incorrect errors fail. The current application's native storage/UI are not mocked
into the business layer; this lane does not mount a React screen.

## Contract coverage

| Area | Verified behavior |
| --- | --- |
| Completion and XP | Due/overdue/future; metadata present/absent; duplicate completion; caregiver, view-only, expired, unrelated and anonymous access; invalid dates; awarded/zero XP and next task. |
| Progression | Initial account, completion crossing a level boundary, maximum level, anonymous rejection; actual `/profile/progression/` envelope. |
| Photos | Definition fallback, no definition/photo, real upload/framing update, actual authenticated JPEG bytes/headers, shared viewing and revoked/expired/anonymous access, replacement conflict. |
| Journal | Mixed task/photo feed, empty, two-page traversal with stable ordering/no duplicates, server filtering, shared/revoked access, invalid cursor; photo create/edit, seven-day admission limit, detail with/without navigation; previous client's three-endpoint history path. |
| Sharing | Direction, roles, expiry, owner revision update and stale revision error; recipients cannot update owner grants. |
| Devices/pump | Actual zero versus missing values, shared credential redaction, minutes and legacy hours/aliases, settings validation, pump duration 1/20/300 and firmware default, invalid values/ownership, chart average/minimum/maximum with sample counts. |
| Invitations | Contact snapshot/counts, incoming/outgoing requests, email queue/cancellation, language, registered/invalid/duplicate/throttled/self/missing/existing-contact errors. No invitation delivery occurs. |

Relevant routes return actual 400/401/404/409/429 errors. Object permissions often
conceal existence with **404**, so this suite does not invent a 403 response.
The matrix protects selected required fields/semantics while permitting harmless
additional response fields. Existing detailed unit/security/concurrency tests remain
necessary and unchanged; this is not an exhaustive test of every endpoint.

## Previous supported mobile client

Pinned by the user: `6f698097ddb17f7740dada6ce37beba1a28ff34e`.
`previous/` contains nine **byte-identical** API/client/serializer files from that
commit. `previous.json` records their repository paths, Git blob IDs and SHA-256.
CI checks them against actual Git history using a full checkout. Never silently
advance this baseline to make a breaking response pass.

Both clients execute against the same current provider responses. The previous
client predates sharing, contacts and private journal photos/pagination; those
features have current-client cases rather than fabricated old implementations.
It uses the old completed-task/reminder/plant history requests. Its completion
helper intentionally returns `void`; today's helper returns awarded XP. Both
consume progression including level transitions. New device fields remain additive.

The uncommitted level-up celebration is excluded. Level-up coverage uses the
committed completion and progression endpoints, without adding celebration fields.

## Running locally

Use the locked backend environment and `npm ci` in `mobile`. From repository root,
set `PYTHONPATH` to the root **and** `backend`, then set:

```text
DJANGO_SETTINGS_MODULE=contracts.api.settings
CONTRACT_PROVIDER_SHA=<exact 40-character commit being tested>
CONTRACT_BUNDLE=<absolute temporary path>/provider.json
```

```sh
python -m pytest -c contracts/api/pytest.ini contracts/api/test_provider.py --junitxml=contract-results/provider.xml
node mobile/node_modules/jest/bin/jest.js --config contracts/api/jest.config.cjs --ci --runInBand --json --outputFile=contract-results/consumers.json
```

SQLite is supported for fast local checks. CI supplies only the disposable loopback
`flovers_ci` PostgreSQL **16** service; it must not fall back to SQLite. Synthetic
`.invalid` users, temporary media, in-memory mail/cache/broker and denied outbound
Python sockets prevent production access or real mail/push. No credentials or
production URLs are workflow inputs. There are no production deployment jobs.

All provider scenarios are required; skips/partial selection cannot export evidence.
The consumer reporter rejects skips/TODOs. Guard tests exercise stale/missing/
tampered evidence. Artifacts and passed/failed/skipped summaries are retained seven
days. No new coverage threshold or large test framework is introduced.

`test-api-contracts.yml` is a standalone compatibility check. Repository branch
protection must separately require **API compatibility gate** when desired; this
workflow does not edit protection or the existing production deployment dependency
graph. No statement here implies it already blocks independent deployment workflows.
