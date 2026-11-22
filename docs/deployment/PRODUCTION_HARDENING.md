# Production deployment: LIGHT and FULL

Both modes are **manual-only**. A push, PR merge, successful CI run or scheduled
job cannot deploy production. Implementing this document does not enable the
disabled backend/website workflows, change GitHub settings or authorize release.
Website publication and mobile publication keep their existing independent gates.

## Mode contract

| Requirement | LIGHT | FULL |
|---|---|---|
| Owner dispatch from current protected `main`, full 40-character SHA | Required | Required |
| All ten exact-SHA `ci/*` checks and complete successful matrix | Required | Required |
| Protected `production-backend` owner approval | Required | Required |
| SSH fingerprint, host lock and workflow concurrency | Required | Required |
| Capacity, existing persistent media, dependencies and readiness | Required | Required |
| Matching running configuration/container identities | Required | Existing FULL preflight |
| Read-only migration-plan inspection; pending migrations refused | Required | Migrations permitted after backup gates |
| Host `deployment-policy.json` and recent coherent backup cohort | Not read or required | Required |
| Real off-server copy and isolated successful restore receipt | Not required | Required |
| Automatic reverse migrations / database restore | Never | Never |

Dispatch requires `deployment_mode` (`LIGHT` by default), `revision`, and the exact
confirmation `DEPLOY BACKEND LIGHT <sha>` or `DEPLOY BACKEND FULL <sha>`.
An invalid/missing mode fails; neither mode falls back to the other. Selecting FULL
does not generate evidence or make its prerequisites pass. LIGHT records
`backup.required=false` and `backup.verified=false` in its private release receipt.

## Exact approval and CI

The workflow accepts only the repository owner's original dispatch and rerun,
from `refs/heads/main`, with `revision == github.sha == current main tip`. It
verifies the live protected environment before build and again immediately before
SSH. Its release job itself targets that protected environment. Environment
review is still a GitHub-enforced approval, not a successful Python assertion.

The read-only gate verifies effective main rules (PR, strict checks, no force
push/deletion) and these contexts from GitHub Actions app **15368**:

`ci/backend`, `ci/mobile`, `ci/web`, `ci/contracts`, `ci/celery`, `ci/firmware`,
`ci/browser`, `ci/android`, `ci/staging`, `ci/release-readiness`.

All must be completed/successful on the exact SHA, from one latest completed
main-push/manual coordinator run. Its entire job matrix must succeed with no
failed, pending, cancelled, timed-out or skipped jobs. A newer unfinished run
blocks release. Missing, truncated or unverifiable GitHub responses fail closed.
PR-head checks cannot substitute for merge-commit checks. The unfiltered
coordinator therefore also runs on every push to `main`, and can be manually
rerun without deploying. Stable required-check names and branch rules are unchanged.

## LIGHT sequence and blockers

1. Verify approval/environment/CI; build the reviewed SHA, label it with its OCI
   revision, obtain its immutable GHCR digest and repeat approval checks.
2. Connect using the pinned host fingerprint; take the existing exclusive host
   lock. Inspect Compose, running containers, persistent media and dependencies.
3. Require at least **2 GiB free disk**, **20,000 free inodes** on application and
   Docker/containerd storage, and **512 MiB available RAM**. These are minimum
   floors, not a guarantee an unusually large image will fit. Pull failure leaves
   the old application running; recheck capacity after pulling.
4. Privately record the previous resolved Compose configuration, exact old image
   IDs, migration-free previous runtime commands and candidate runtime commands.
   Configuration snapshots contain secrets: directories are `0700`, files `0600`;
   never upload these as public CI artifacts.
5. Require exactly one healthy web, worker and Beat; verify project/service labels,
   startup commands, environment and media mount sources/permissions match Compose.
   Capture IDs, image IDs, restart counts and start times; refuse drift before stop.
6. Inspect the previous and candidate migration plans in separate containers with
   PostgreSQL `default_transaction_read_only=on` before Django initializes. Reject
   pending/conflicting/inconsistent migration history. Fingerprint applied rows.
7. Stop Beat, then drain web, then warm-stop worker (120-second grace per process).
   Reject OOM, non-exited containers or forced SIGKILL. Reinspect the candidate's
   read-only migration plan/history after writers stop. **Never invoke migrate.**
8. Start direct Gunicorn, worker, then Beat, using the approved digest and explicit
   cleared entrypoints. Require web HTTPS/auth boundary and DB/Redis, worker ping,
   and Beat startup/schedule probes; repeat readiness for all services at the end.
9. Persist the migration-free release override and healthy receipt. Retain previous
   images; existing scoped obsolete-image maintenance never removes volumes/media.

LIGHT removes only the known legacy `python manage.py migrate [--noinput] &&`
prefix from supported Gunicorn startup; it never executes that shell. Unknown
shell scripts, compound commands, custom image entrypoints, different process
roles or image OS/architecture/revision mismatch block LIGHT. This is a supported
configuration check, not permission to silently rewrite arbitrary production hooks.

## Failure recovery and accepted risks

Before stopping writers, any failed check leaves the old deployment running.
After stopping starts, failure attempts to stop partial new writers and recover
the **old image IDs using migration-free direct commands**, only if the old image
also has no pending migrations and the applied-history fingerprint is unchanged.
Readiness is checked again. A successful recovery still fails the release run.
Failed recovery is recorded as `recovery-required`; it requires an operator.

Normal SIGTERM/SIGHUP attempts this cleanup. SIGKILL, host/power loss, a second
termination signal or Docker failure cannot guarantee automatic recovery. Do not
blindly restart the old web container: its original command may run `migrate`.
Use the private `previous-compose.json` plus `previous-runtime.json` with Compose
and retained images, after verifying migration history and service health. Start
web, then worker, then Beat. Do not run reverse migrations. A changed schema or
unverified recovery state requires an explicit operator decision.

Without verified backups, application bugs, deletions, corrupted media or business
data changes may be unrecoverable. Image rollback is **not data rollback**. Media
and DB are not captured by LIGHT. Planned downtime includes graceful shutdown and
readiness (potentially several minutes); no high-availability guarantee is made.

An empty migration plan does **not** make application execution read-only. Normal
API traffic, ESP32 ingestion, queued Celery tasks and Beat schedules write business
data after startup. Reviewed current Django app startup registers signals without
writing rows; imports and future hooks remain executable code and require review.
The probe prevents PostgreSQL startup writes, but cannot sandbox arbitrary Python
filesystem/network effects. The legacy `migrate` command can emit `post_migrate`
and write permissions/content types even with an empty plan, hence LIGHT bypasses
it entirely. Model checks do not prove absence of manual schema drift or unsafe
SQL embedded in future application code. Avoid concurrent operator DDL/releases.

## Activating FULL later

Keep existing [FULL recovery runbook](../../deployment/PRODUCTION_RELEASE.md),
backup verification code and recovery tooling. Before FULL, obtain a real coherent
PostgreSQL/private-media/public-media cohort, checksums, verified encrypted
off-server copy, and successful isolated restore with record/media-reference
verification. The current verifier requires evidence no older than 24 hours and
matching configuration. Supply the reviewed private host policy and real receipt;
never fabricate a manifest or change a failed field to `true`.

Owner-controlled recovery-key custody must include an independently recoverable
encrypted offline copy and separately held passphrase, not only Windows DPAPI.
Real-data restore needs a trusted isolated environment, protected plaintext
storage, disabled external integrations and verified cleanup. These owner steps
remain **deferred**, and are not LIGHT prerequisites. FULL retains migration and
manual data-recovery safeguards; irreversible/no-op reverse migrations still need
restore planning. This change performs no new backup preparation.

## First LIGHT deployment: approvals still required

1. Review this PR and separately approve merging it; no merge is authorized by
   implementation approval. Wait for the full exact-main coordinator to pass.
2. Obtain approval to enable the backend workflow. Keep website/mobile publication
   separate. Verify live environment reviewer/branch restrictions and SSH pin.
3. Obtain approval for the exact SHA and LIGHT's no-verified-backup risk. Perform
   fresh authorized production preflight; unknown pending migrations may block it.
4. Owner dispatches the backend workflow from `main` with mode/SHA/confirmation,
   then explicitly approves the protected environment. This PR does not do so.

If migrations are pending, LIGHT is **NO-GO**: prepare genuine FULL prerequisites
or approve a separate reviewed migration plan. Do not fake migrations, mark them
applied, weaken CI or bypass environment review to make LIGHT proceed.
