# Real Celery delivery integration

This opt-in Linux lane exercises the application's actual task functions in a
separate Celery **prefork process**, with PostgreSQL 16, Redis 7.4.7 and Mailpit
1.34.0. Nothing here is imported by production settings. It adds no runtime
dependency and does not change existing fast tests or deployment workflows.

## What is verified

| Case | Evidence |
| --- | --- |
| JSON serialization and registration | Nested/Unicode payload makes a Redis round trip; worker PID differs from pytest; worker reports its real PostgreSQL database/version and registered application tasks. |
| Invitation delivery | `invite_by_email` creates the real durable outbox; a Redis-dispatched application task sends through SMTP into Mailpit. Verify recipient, localized text/link, sent timestamp and attempts. |
| Commit visibility | A worker drain inside the producer transaction cannot see/send uncommitted rows. After commit, a subsequent drain delivers them. |
| Rollback | Rolled-back invitation/outbox data cannot produce mail. |
| Duplicate task messages | Send the same task ID twice through Redis; the outbox produces one SMTP message and one claim. |
| Celery retry | A test-only probe uses actual `self.retry`, Redis state and worker re-execution. |
| SMTP retry | Pause only this run's capture container, observe real SMTP timeout/backoff, then restore it and deliver the retry once. |
| Worker loss and lease recovery | Kill the entire worker process group after its durable claim while SMTP is paused. A fresh worker cannot reclaim a live lease; after the synthetic row's lease expires, it recovers and sends once. |
| Broker restart | Gate the prefork child, enqueue a real invitation task behind it, snapshot/restart only this run's Redis container, release the gate, and prove the same live worker reconnects and consumes the persisted message. |
| Revoked notification consent | Queue the real daily-notification task with the worker stopped, revoke email consent in PostgreSQL, restart worker, and verify the queued delivery is skipped with no captured email. |
| Beat | Start a separate Celery Beat process with a one-second test-only schedule for the existing invitation-drain task. No explicit producer dispatch in the test; Beat/Redis/worker deliver the outbox. |

The probe/retry/gate tasks provide transport evidence and deterministic barriers;
they do not replace invitation/notification business functions. The SMTP subclass
uses Django's real SMTP backend and adds recipient/endpoint safety checks only.
Worker/capture failure is induced by process/container controls, not mocks.

## Isolation and limits

- Explicit `FLOVERS_INTEGRATION=1`, unique run namespace and fixed loopback
  `flovers_ci` test credentials are mandatory. Database identity and PostgreSQL
  major version are checked **before migration**. SQLite never substitutes.
- CI settings disable dotenv, temporary uploads stay outside project storage,
  Firebase credentials are cleared, and Python sockets are restricted to literal
  loopback IPs. Libpq connects only to the validated PostgreSQL endpoint.
- SMTP targets only local Mailpit and `.invalid` recipients. No SMTP relay or
  production/Firebase secret is supplied. No real email or push is sent.
- Docker controls require full container IDs plus the exact image, role and
  run labels. They never operate on arbitrary names, other runs or production.
- Each test starts its own worker and queue. Publishers/consumers stop before
  transactional DB cleanup. Beat runs only in its dedicated case. The runner and
  worker deliberately share the disposable service DB, not separate `test_` DBs.
- Real production leases/backoff remain unchanged. Tests move only a synthetic
  outbox row's deadline into the past instead of waiting 15 minutes/one minute.
- Broker persistence in the recovery case uses an explicit Redis snapshot; it
  does not certify the VPS Redis persistence configuration.
- Crash coverage stops **before SMTP acceptance**. SMTP acceptance followed by a
  worker crash before recording `sent` can still cause a duplicate on retry;
  exactly-once external email cannot be guaranteed by a database outbox alone.
- Test SMTP consent is checked through the real daily-notification task. This
  lane deliberately does not contact FCM or validate native push presentation.
- This is a single-host prefork/broker correctness suite, not a load test or
  production deployment/recovery rehearsal.

## GitHub Actions

[Celery integration checks](../../.github/workflows/test-celery-integration.yml)
runs separately on relevant pushes, PRs and manual requests. It uses disposable
service containers without production credentials. Every one of the 11 named
cases is required by an [execution policy](../../.github/test-policies/celery-integration.json).
Missing/deselected/skipped/failed cases fail reporting; there is no skip allowlist.
No flaky retry or continue-on-error hides failures.

JUnit, per-test worker/Beat logs, service logs and the test summary are uploaded
for seven days, including failed runs. Isolation guard unit checks run before the
service suite. Existing fast quality lanes remain independent; this PR does not
wire the new lane into production deployment or change publication frequency.
Configure the named `real-delivery` check as required in repository branch rules
when approving rollout; YAML alone cannot enforce a repository's merge rules.

## Run on disposable Linux infrastructure

Use the same locked application/CI dependencies as existing quality checks. The
suite requires Linux, Docker access and free loopback ports 5432/6379/1025/8025.
Do not point these commands at any existing application service.

```sh
export FLOVERS_INTEGRATION=1
export FLOVERS_INTEGRATION_RUN=local-unique-run
export DJANGO_SETTINGS_MODULE=integration.celery.settings
export CI_DATABASE_URL=postgres://flovers_ci:flovers_ci@127.0.0.1:5432/flovers_ci
export PYTHONPATH="$PWD:$PWD/backend"
docker compose -p "flovers-it-$FLOVERS_INTEGRATION_RUN" -f integration/celery/compose.yml up -d
export FLOVERS_REDIS_CONTAINER=$(docker compose -p "flovers-it-$FLOVERS_INTEGRATION_RUN" -f integration/celery/compose.yml ps -q redis)
export FLOVERS_MAILPIT_CONTAINER=$(docker compose -p "flovers-it-$FLOVERS_INTEGRATION_RUN" -f integration/celery/compose.yml ps -q mailpit)
export FLOVERS_POSTGRES_CONTAINER=$(docker compose -p "flovers-it-$FLOVERS_INTEGRATION_RUN" -f integration/celery/compose.yml ps -q postgres)
# Resolve full IDs if your Compose installation returned shortened IDs.
export FLOVERS_REDIS_CONTAINER=$(docker inspect --format '{{.Id}}' "$FLOVERS_REDIS_CONTAINER")
export FLOVERS_MAILPIT_CONTAINER=$(docker inspect --format '{{.Id}}' "$FLOVERS_MAILPIT_CONTAINER")
export FLOVERS_POSTGRES_CONTAINER=$(docker inspect --format '{{.Id}}' "$FLOVERS_POSTGRES_CONTAINER")
python -m unittest discover -s integration/celery/checks -p 'test_*.py' -v
python -m pytest -c integration/celery/pytest.ini --junitxml=test-results/celery/results.xml
python .github/scripts/report_tests.py --title 'Real Celery integration' \
  --junit test-results/celery/results.xml --policy .github/test-policies/celery-integration.json \
  --output test-results/celery/summary.md
python -m integration.celery.cleanup
docker compose -p "flovers-it-$FLOVERS_INTEGRATION_RUN" -f integration/celery/compose.yml down --volumes
```

The final command removes only the disposable project created above. Do not reuse
the project name, service IDs or database for application work. Missing services
or unsupported platforms produce a failure, never a silently skipped test suite.

Framework references: [Celery integration testing](https://docs.celeryq.dev/en/stable/userguide/testing.html),
[Celery configuration](https://docs.celeryq.dev/en/stable/userguide/configuration.html),
[Mailpit capture API](https://mailpit.axllent.org/docs/api-v1/).
