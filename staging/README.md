# P1-C: disposable staging and migration rehearsal

This suite runs only on a disposable GitHub-hosted Ubuntu 24.04 runner. It does
not use the VPS, production credentials, real recipients, physical boards or
production storage. It does not promote an image or call a deployment workflow.
Existing deployment/publication workflows are unchanged.

## Exact-image architecture

`test-staging.yml` builds the existing `backend/Dockerfile` **once**. Migration
tools, Gunicorn (two workers), a real Celery worker and Beat all use that same
immutable local `sha256:` image ID. The runner asserts each running container's
actual `Image` field equals the migration image. This is the Docker image/config
digest, not a registry manifest digest; no application image is published.

PostgreSQL 16 and Redis 7.4.7 use registry manifest digests frozen in
[`images.lock.json`](images.lock.json). `image-digests.json` records those refs,
their local IDs, the exact application image ID and source commit for each run.
The application's Python base and hashed CPU-only dependencies are the existing
production Dockerfile's pins. Test modules are mounted read-only; the application
image is not rebuilt or replaced to run tests.

All services share one `internal: true` Compose network. No host ports are
published. App processes run as UID/GID 10001 with a read-only root filesystem,
all capabilities dropped and no privilege escalation. Disposable named volumes
hold PostgreSQL, private media, public catalogue media, static files and private
test state. App volumes use `nocopy` so an empty mount cannot be reinitialized
with the image directory's root ownership. A short-lived, run-owned initializer
sets volume ownership; verification checks it again as the app user. Only
synthetic reports are written into the host artifact directory.

Test settings require explicit staging/run markers and exact PostgreSQL/Redis
URLs, refuse production/provider credentials, disable dotenv, deny external
socket destinations/name resolution, and reject all attempted email delivery.
Firebase credentials are empty. All fixture notification consents are disabled.
The Compose network additionally isolates processes outside Python's guard.
See [Docker's internal network option](https://docs.docker.com/reference/compose-file/networks/#internal).

## Required verification phases

Every one of these phases must pass. Missing or skipped phases fail the report.

1. Build once and pin all images.
2. Start healthy PostgreSQL/Redis and initialize persistent volume permissions.
3. Construct the previous-supported schema and deterministic synthetic data.
4. Back up that schema with `pg_dump -Fc`, restore into a separate disposable
   database, and verify accounts, plant/task relationships and task notes.
5. Advance to the historical media checkpoint and create existing media fixtures.
6. Apply all remaining real Django migrations and check every pre-existing
   application row and relationship, allowing only documented migration changes.
7. Verify declared indexes/constraints, PostgreSQL index/constraint validity and
   actual rejection of invalid pending-task and photo-framing writes.
8. Re-run `migrate`: no application rows or media may change.
9. Start healthy Gunicorn, real non-eager Celery worker and Beat. Verify task
   registration, worker execution/database visibility and a heartbeat dispatched
   by Beat before the explicit probe task is sent.
10. Exercise JWT-authenticated read-only API calls, anonymous denial, unrelated
    account denial, accepted sharing access and location privacy.
11. Check media bytes, hashes, database references, paths, permissions and access.
12. Run the separate read-only smoke command and compare every application row
    before/after to confirm it did not modify database records.
13. Stop PostgreSQL and Redis one at a time. Liveness stays 200, readiness becomes
    503, existing APIs return sanitized errors and the smoke command fails. Restore
    services and require healthy web/worker/Beat/API operation again.
14. Force-recreate web, worker and Beat from the same image ID and same private
    volume. Verify existing media and the read-only smoke again.
15. Verify runtime isolation, no published ports, actual image IDs and health.
16. Remove this run's containers, networks and volumes and assert none remain.

The runner has a `finally` cleanup plus a separate `if: always()` workflow cleanup.
Only containers with the exact unique Compose project/run/role labels may be
controlled. GitHub runner disposal is the final boundary for forced job/VM death.
No blanket retries or success-on-error are used. Bounded service readiness polls
are not test retries. Diagnostics are retained for seven days.

## Historical schemas and fixtures

The supported legacy baseline is commit
`6f698097ddb17f7740dada6ce37beba1a28ff34e`. The frozen manifest contains all 38
application migration hashes and per-app targets from that commit. These hashes
are checked against the image before using Django's real `MigrationExecutor`.
This avoids pretending that a fixture created with today's models is an older
schema. Three synthetic accounts, a translated definition, location, linked
plant, pending/completed tasks, XP receipt, device/reading and manual pump record
are created using historical model classes. No real logins or identifying data
are copied. Accounts have unusable passwords; short-lived JWTs are minted only
inside private disposable state after the upgrade.

That October baseline predates uploaded plant/journal photos. The rehearsal
therefore advances through a **documented intermediate historical checkpoint**:
`plant_instances.0008_journal_photos`, `profiles.0021_inboxnotification`,
`readings.0009_reading_intervals_and_missing_alerts`, `contacts.0002_emailinvitation`,
and the corresponding dependency targets in `rehearsal.py`. Existing cover and
journal photo metadata and JPEG files are created there, before the remaining
forward migrations. One missing-file reference is deliberately retained.

The final assertions preserve all legacy/checkpoint row projections, including
relationships, notes, XP, readings, pump duration and media metadata. Explicit
exceptions are profile background default migration and completed-task owner
backfill; the latter is independently checked. Interval conversion from 2 hours
to 120 minutes and one historical inbox receipt backfill are checked directly.
The final upgrade must have an empty migration plan. This is representative
synthetic data, not a complete catalogue or production dataset rehearsal.

## Media evidence

Two public definition JPEGs plus cover/journal display and thumbnail JPEGs retain
their bytes and SHA-256 hashes across migrations and application recreation.
All four private variants must be served identically to the owner and accepted
shared reader, with `private, no-store`/`nosniff` response headers. Anonymous and
unrelated users must be denied. Both variants of the missing-file reference must
return 404 without destroying the metadata or exposing filesystem paths.
Private root permissions must be `0700`; file permissions and the named private
volume identity must remain unchanged. No production storage is mounted.

## Separate read-only post-deployment smoke

[`deployment/read_only_smoke.py`](../deployment/read_only_smoke.py) is a standalone
stdlib command. During a separately approved release, an operator could provide
the **explicit approved HTTPS API origin** and an existing short-lived account
token in `FLOVERS_SMOKE_TOKEN`, then run:

```powershell
python deployment/read_only_smoke.py --base-url <approved-HTTPS-origin>
```

The command has no default host and never logs in or creates an account. It sends
only GET requests: anonymous `/locations/` must return 401; authenticated
`/locations/`, `/plant-instances/`, `/readings/devices/` and the journal page must
return JSON collections. Requests/time/body size are bounded; redirects and
environment proxies are disabled, HTTPS certificates are verified, errors are
nonzero, and tokens/response bodies are not logged. It deliberately avoids
profile GET endpoints that can lazily create rows. Normal Redis throttle counters
may advance, as with any real request; business database records must not change.

The staging-only HTTP override accepts only loopback/Compose hosts. Its additional
readiness route exists **only in staging URLs**. The command is exercised solely
against the disposable stack here. It is not wired into production deployment
and was not executed against production. Worker/Beat health is verified by the
staging suite; the standalone HTTP command cannot independently prove their
health on a future production host without separately approved readiness support.

## Migration recovery and special handling

Do not automatically reverse an arbitrary migration chain. Django's reverse
operation availability does not imply lost/rewritten data can be reconstructed;
see [Django data migrations](https://docs.djangoproject.com/en/6.1/topics/migrations/#data-migrations).
`migration-risk-inventory.json` lists every `RunPython` and its reverse handler.
Currently their reverse handlers are no-ops, so database/media restore is the
recovery method for data changes, even where schema operations are reversible.

| Migration group | Special handling |
| --- | --- |
| `accounts.0002` / `.0003` | Case-insensitive identity cleanup and generated Flovers IDs cannot recover previous values by running backwards. Preserve identities and review conflicts. |
| `plant_instances.0003` / `.0004` | QR backfill and copied intervals have no data reversal. Preserve codes and user-selected intervals. |
| `reminders.0004` / `.0005` / `.0006` | Invalid intervals, duplicate pending tasks, completed-event snapshots and completing-user backfill need a consistent backup; schema rollback loses snapshot/actor fields. |
| `readings.0007` / `.0009` | Preserve observation/pump uncertainty and interval conversion. Do not restart old watering writers blindly after partial upgrade. No pumps are connected here. |
| `profiles.0002` / `.0013` / `.0022` | Default rows and delivery/inbox backfills do not undo themselves. Keep receipt uniqueness and consent unchanged. |
| `plant_definitions.0005` / `.0006` | Reviewed catalogue corrections abort on conflicting source values; inspect conflicts instead of bypassing checks. No-op reversal does not restore former advice/popular flags. |
| Photo/journal schema and private volume | Preserve a consistent DB **and** private-volume snapshot. Dropping metadata tables is not a safe media rollback; never expose private files through public media mapping. |

For a future approved deployment: stop writers; take and verify consistent DB and
private-media backups; retain the prior image digest; run forward migrations from
the intended digest; start services and run approved read-only checks. On failure
keep writers stopped, inspect the exact failed migration and restore a verified
matching DB/media pair when required before restarting an older image. Never
promote just because containers exist. This suite restores a synthetic PostgreSQL
backup; it does not certify a production backup, storage snapshot or disaster
recovery procedure.

## Remaining limits

No production VPS/Compose inspection, HTTPS/Caddy/Traefik routing, real provider
delivery, physical boards, storage exhaustion, production-size migration timing,
catalogue conflict matrix, or live recovery is covered. Existing application
endpoints return generic HTTP 500 when dependencies fail; the new staging-only
readiness endpoint returns 503. Production has not gained a new health endpoint
or automatic promotion gate in its deployment workflow. A future release must
separately approve how these checks are consumed operationally. CI capacity and
performance do not establish suitability for the 20 GB VPS.
