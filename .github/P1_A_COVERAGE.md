# P1-A: high-risk behavioral regression coverage

This change is stacked on P0-C3. It changes tests and their documentation only.
No application, deployment, publication or dependency behavior changes.

## Added cases

| Suite | New cases | Observable outcomes |
| --- | ---: | --- |
| `backend/readings/tests/test_notification_adapters.py` | 27 | Real EN/PL text and HTML email rendering; moisture and automatic/manual pump payloads; recipient and token isolation; delivery-time consent; no recipient/device/pump; unsupported locale fallback; rejected/throwing/malformed providers; partial FCM success; invalid token retirement; channel independence; inbox contents/deduplication/deletion tombstones; queued missing-reading retry/backoff/success and revoked consent. |
| `AccountRecoveryBehavior.test.tsx` | 17 | Activation links/aliases and incomplete/expired links; pending confirmation; login/reissue navigation; leaving pending activation; required recovery/resend email; disabled pending submit; API/network errors and successful retry; invalid reset forms; expired reset errors; password submission and authenticated/anonymous success navigation. |
| `LocationsBehavior.test.tsx` | 12 | No premature empty state; HTTP 401/403/500 and retry; actual create/edit/delete forms and tile menus; cancellation; denied create/update/delete; assigned-plant deletion guard; stale success/failure responses; leaving and returning. |
| `ReadingsBehavior.test.tsx` | 13 | Wait for both device and plant datasets; HTTP 401/403/500 and retry; actual link/edit forms including minute interval/pump settings; delete cancel/failure/success; failed update; optimistic pump rollback; shared read-only controls/navigation; stale success/failure responses and screen return. |
| Provider-verified contracts | 7 provider cases + 14 consumer replays | Expired JWTs on completion/progression/plant/device; revoked sharing on completion/device/pump. Current and pinned previous clients preserve both HTTP status and full error body. |

Existing private-photo, inbox, location, sharing authorization and concurrency
suites remain intact. The previous client source baseline remains
`6f698097ddb17f7740dada6ce37beba1a28ff34e`. The complete contract matrix now
contains 91 provider scenarios and 136 consumer/guard checks.

## Isolation and assertions

- Backend adapter tests use the real ORM, templates, translations and inbox.
  Only external SMTP/FCM delivery is isolated: Django in-memory email and
  synthetic FCM results. No real Firebase credentials, broker or SMTP endpoint.
- Mobile tests mount real screens, tiles, forms, validation and request guards.
  Navigation focus, API services, header/FAB presentation, modal frame and
  native portal shells are replaced by deterministic test boundaries. These
  tests cover user interactions and displayed outcomes, not native layout.
- Deferred promises control request completion and reordering. Mobile animation
  timers are fake and cleaned up after unmount; backend time is fixed.
- API errors for compatibility tests come from real Django/DRF responses and
  pass through the same verified artifact used by both client generations.
- No existing suite, assertion, skip rule or coverage threshold is weakened.

## Verification

Use the existing [quality commands](QUALITY_CHECKS.md) for the full suites,
coverage and skip reports. The existing path filters already select backend,
mobile, compatibility, Celery and firmware checks for these changes; there is
no additional deployment/publication workflow or new test framework.

Focused commands (set isolated test settings first):

```sh
# backend directory
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest readings/tests/test_notification_adapters.py
# mobile directory
npm test -- --runInBand --runTestsByPath \
  src/features/auth/pages/__tests__/AccountRecoveryBehavior.test.tsx \
  src/features/readings/pages/__tests__/ReadingsBehavior.test.tsx \
  src/features/locations/pages/__tests__/LocationsBehavior.test.tsx
```

Use the [provider/consumer commands](../contracts/api/README.md) for contracts.
Hosted PostgreSQL/C++/firmware checks remain mandatory with no skip allowance.
SQLite local results cannot substitute for hosted concurrency verification.
Compare coverage with PR #4's clean artifacts, not the unrelated dirty workspace.

## Remaining gaps / follow-up work

- Moisture and pump alerts are existing best-effort immediate adapters. They
  catch provider errors and do not persist a retry job. Repeated calls can send
  more than one email/push even though inbox events deduplicate. Tests document
  this distinction; adding a durable outbox is separate application work.
- Moisture/pump push currently targets active Android tokens only. Missing-reading
  alerts use the common adapter and include both iOS and Android tokens. This
  testing PR preserves that behavior.
- Leaving an auth form does not abort its HTTP request. Reset-password success
  still calls navigation after its awaited response; a response arriving after
  leaving that screen needs a separate cancellation/lifecycle fix. The activation
  cancellation flag also lacks effect cleanup. No cancellation guarantee is
  inferred from the passing leave-navigation test.
- Screen tests do not measure native modal geometry, gestures, platform secure
  storage implementation or real vendor delivery. Native/E2E and physical
  device checks remain future roadmap work.
- Readings/Locations protect list loads against stale visits. Their mutation and
  device-detail callbacks do not all use the same guard; tests here do not claim
  full stale-mutation protection.
