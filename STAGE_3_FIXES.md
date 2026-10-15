The stage 3 fixes are implemented in the working tree across the backend, mobile app, generated firmware, and deployment configuration. They address all 12 confirmed finding groups in [the audit](STAGE_3_AUDIT.md), the three deployment risks, and the editor response-ordering candidate. No changes have been deployed to the Hetzner VPS, no project database migrations have been applied, and no physical devices have been reflashed.

| Finding | Implemented behavior |
| --- | --- |
| S3-01: Firmware TLS | Generated sketches require HTTPS, a valid clock, and verified server certificates. Bundled ISRG Root X1/X2 trust anchors support Let's Encrypt; another issuer can be configured through `IOT_TLS_CA_CERT`. Credential-bearing request bodies are no longer printed to serial logs. The website's example is regenerated from the same source. |
| S3-02: Device quotas | Credentials and ownership are resolved before a device's quota is charged. Device-ID and key-only requests use the same canonical identity. Telemetry, feed, polling, and completion have independent budgets; polling cannot consume the completion budget. Invalid requests retain the anonymous abuse limit. Inactive accounts cannot use device credentials. |
| S3-03: Watering after reboot | New firmware obtains an atomic backend automatic-watering claim before pumping. The backend reserves a persisted cooldown before granting execution, and the firmware persists its own cooldown before manual or automatic physical execution. Missing clock/storage, corrupt safety state, denied claims, and lost claim responses fail closed. Claim task IDs make automatic completion idempotent. Manual first-delivery retry capability is recorded, preventing replay of an old receipt-less delivery after an upgrade. |
| S3-04: Measurement integrity | Ingestion validates timestamps and finite metrics, preserves omitted values in partial updates, tracks actual observation time separately from hourly buckets, and prevents older data from rewinding snapshots/alerts. Explicit null clears a supplied metric. Failed database writes return retryable HTTP 503 rather than false success. History deletion refreshes snapshots under the same device lock. |
| S3-05: Notification delivery | Durable recipient/channel/day work is atomically claimed before sending. Failures are isolated, retried with backoff, and recovered after expired leases. Missed preferred minutes catch up within the same local day. Preferences, account state, and pending work are rechecked before sending. SMTP operations have a configured timeout. |
| S3-06: Completed history | Completed events preserve plant, care type, display/location names, interval, and start date. Editing future reminders cannot move or relabel these events. Journal queries, history filters, exports, and mobile history use the snapshots. |
| S3-07: Stale writes | Reminder edits/completions reload and lock current state in a consistent order. Duplicate completion cannot overwrite the first event's note/date. A database constraint permits only one pending task per reminder. Device settings updates lock and write selected fields, preserving newer snapshots, alerts, and pump summaries. |
| S3-08: Account identities | Account writes normalize email identities; database `Lower(email)` uniqueness closes case-variant races. Uniqueness conflicts return validation errors. The migration refuses existing collisions before modifying data, reporting account IDs for deliberate reconciliation. |
| S3-09: Creation retries | Mobile retains a UUID per draft. User-scoped backend receipts commit with the plant and generated reminders. An identical retry returns the original response without another creation; changed payloads fail validation. Deletion leaves a receipt tombstone, and a removed catalog definition does not prevent an exact replay. |
| S3-10: Local photo loss | Per-plant queues serialize replacement and deletion. Cleanup cannot remove another queued replacement. The photo modal blocks close/discard during an active save, and unlocks after failure. |
| S3-11: Interrupted logout | Logout invalidates local authentication and starts durable credential clearing before push cleanup. Cleanup uses only a captured old access token, never refreshes into a later session, and has a five-second deadline. |
| S3-12: Spreadsheet input | Shared export handling writes user text as literal cells and removes XML-invalid controls. Formula-looking names/notes remain text. |

The two plant editors also reject responses belonging to an earlier edit request or arriving after close/blur. This addresses the lower-confidence audit candidate without depending on the loading overlay for correctness.

Deployment hardening includes Docker secret exclusions, explicit production signing keys, bounded SMTP timeout, trusted proxy identity handling, shared Redis throttle-cache configuration, and private/loopback service bindings. Concrete examples for a Hetzner VPS using host Caddy or Docker Traefik are in [deployment/README.md](deployment/README.md). The actual `/opt/app/docker-compose.prod.yml` and live proxy configuration are outside this checkout; the examples must be merged with that configuration.

Rollout requires coordinated application and schema updates:

1. Review the [production configuration and proxy instructions](deployment/README.md). Preserve existing private credentials and database/SMTP/Firebase settings. Supply production signing keys, the actual trusted proxy peer, shared throttle cache, and HTTPS site URL to web/worker/beat. Keep backend, PostgreSQL, and Redis inaccessible from the public network.
2. Keep a current database backup. The updated backend workflow automatically checks the new image, pauses application writers/workers, runs all pending migrations using the real production service/environment, and starts the same pinned image. See [the deployment sequence and failure behavior](deployment/README.md#automatic-backend-deployment). There is brief backend downtime; failed migrations stop the release and require correction before rerunning it.
3. Release the mobile update to obtain draft idempotency, serialized photo changes, prompt local logout, immutable history display, and editor guards. Older clients remain accepted but do not gain create-request deduplication.
4. Regenerate and reflash device sketches. **Legacy automatic watering is disabled by backend responses until firmware advertises and uses the new claim protocol.** Manual commands first delivered without persistent-receipt support are not automatically replayed to upgraded firmware. Review/recall uncertain old commands before explicitly scheduling another watering.
5. Validate the deployed proxy identity, migrations, notification delivery, and real devices before relying on the rollout. Confirm the certificate issuer matches the generated trust anchors; see [readings/TLS.md](backend/readings/TLS.md).

Five new migrations accompany these fixes:

- [accounts.0002](backend/accounts/migrations/0002_email_case_insensitive_identity.py): preflight identity collisions, normalize existing addresses, add case-insensitive uniqueness. Existing activation/reset links for normalized addresses may need to be requested again.
- [plant_instances.0005](backend/plant_instances/migrations/0005_plant_creation_receipts.py): durable creation receipts and deletion tombstones.
- [reminders.0005](backend/reminders/migrations/0005_completed_events_and_one_pending_task.py): backfill completed snapshots, preserve superseded pending rows as cancelled, enforce one pending task and completed-event presence.
- [profiles.0013](backend/profiles/migrations/0013_notification_delivery_outbox.py): notification claim/retry state; existing sent logs remain sent.
- [readings.0007](backend/readings/migrations/0007_reading_observation_and_pump_safety.py): observation timestamps, persistent cooldowns, and first-delivery retry safety. Uncertain old deliveries conservatively establish a cooldown during migration.

Apply any earlier pending migrations as part of the same reviewed plan. Do not mix old and new account/reminder writers while these changes are applied.

Validation completed in isolation:

- **456 backend tests passed**, including migration/backfill checks and generated C++ execution tests.
- Mobile: **30 Jest suites / 103 tests passed**; four additional editor response-ordering scenarios passed.
- TypeScript comparison: **449 existing diagnostics, zero introduced** against the reconstructed baseline. This is not a clean TypeScript build.
- Web: **two contact tests passed**, production build passed, and generated firmware example matches the backend generator.
- Django system checks passed and `makemigrations --check --dry-run` reported no model/migration drift.

Backend tests use in-memory SQLite and mocked external delivery. The firmware harness compiles the generated pump implementation and simulates fresh flash, reboot, interrupted execution, lost replies, storage failures/corruption, unavailable clock, and longer cooldowns. Physical ESP32/native mobile builds, production PostgreSQL concurrency, SMTP/FCM, the live TLS certificate chain, and the deployed proxy remain untested. No real services, credentials, application data, or live infrastructure were used by these checks.

Historical backfill preserves the metadata currently available; it cannot reconstruct previously overwritten readings, removed photos, or journal associations changed before this update. Provider acceptance followed by a process crash can still produce a repeated notification after lease recovery; raw SMTP/FCM delivery does not provide an exactly-once guarantee.

Validation artifacts are retained in `C:/Users/pudel/AppData/Local/Temp/flovers-flow-audit-80b29ff309af415fbc964ff7c15d9c94/`, including the backend release log/summary, `stage3_mobile/final_jest_results.json`, `stage3_mobile/tsc_comparison.json`, and the isolated web build.
