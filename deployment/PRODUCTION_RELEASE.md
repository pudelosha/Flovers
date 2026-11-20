# Explicitly approved production releases

This is a reviewed-code preparation, not permission to release. No environment,
branch rule, secret, production service or data is changed by the PR or its CI.
Production workflows are manual only. CI remains automatic on PRs and relevant
pushes. Merging the final combined tree does not itself deploy backend or Pages.

## Integration boundary

The current, unmodified main still has automatic production workflows. Do not
sequentially merge the older stack before this hardening is included. During a
separately approved window, prepare one integration candidate containing the
testing stack, coordinator and this hardening; require its complete CI; then
merge that complete tree atomically. Cancel any previously queued automatic
production runs with approval. Never rerun legacy deployment runs: they retain
their old workflow and do not gain these guards retroactively.

## GitHub configuration: requires separate approval

The repository is public and the current owner has administration permission.
GitHub supports required environment reviewers for public repositories on its
current plans. A paid personal subscription was not inferred from repository
access. Private-repository availability differs; if protection is unavailable,
the precheck must stay blocked, rather than falling back to an unprotected job.
See [GitHub environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
and [deployment review](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments).

After separate approval, configure both `production-backend` and the existing
`github-pages` environment:

1. Required reviewer: only user `pudelosha`.
2. Leave **Prevent self-review** disabled: this is a single-owner repository.
   The owner dispatches the exact revision and then reviews the environment job.
3. Disable administrator bypass of environment protection.
4. Use selected deployment branches/tags: exactly branch `main`, no wildcards,
   extra branches or tag rule named main.
5. Put `VPS_HOST` and `VPS_SSH_KEY` in `production-backend` environment secrets;
   after verifying the migration of these values, remove repository-wide copies
   with approval. Set the independently verified `VPS_HOST_FINGERPRINT` environment
   variable (SSH SHA-256 host fingerprint), and optional `BACKEND_SERVICE`.
6. Keep Pages publication from Actions; this PR does not enable Pages or change
   its custom domain, DNS or environment settings.

The authorization job has read-only contents/actions permissions. It reads the
event and protected-environment metadata before any job references that
environment. Missing settings, API errors/403/404, non-owner dispatch/rerun,
non-main refs, default/incorrect inputs and admin bypass all block release.
The protected job rechecks settings after review. No PAT with write permission
is needed; if GitHub cannot provide read-only environment inspection with the
workflow token, investigate permissions rather than adding a bypass. Environment
review is enforced by GitHub, not by an input checkbox.

Owner/admin control of repository code/settings remains a trust boundary. This
does not prevent an administrator deliberately replacing the guards. Do not
enable protection settings or dispatch production workflows during PR review.

## Required host prerequisites

The existing production Compose/proxy configuration is not in this repository
and has not been accessed for this change. A separately approved host preflight
must confirm all of the following:

- Linux, Python 3.8+, Docker and Compose supporting `up --wait --wait-timeout`.
- `/opt/app/docker-compose.prod.yml`; all web/worker/Beat writers use the Flovers
  backend image. Database, Redis and proxy are already healthy.
- Existing shared private-media mount in every application service. The deployer
  preserves the mount and refuses inconsistent/absent mappings; initial storage
  provisioning is a separate approved operation. Public catalogue media also has
  an independently preserved backup.
- At least 2 GiB available and 20,000 free inodes on app, Docker, containerd (when
  present) and backup filesystems, checked before and after pull. These are minimum
  headroom checks, not proof that an arbitrarily large image/restore will fit.
  On the 20 GB VPS, inspect actual image and backup sizes before approving.
- Local previous images exist; GHCR access can re-pull recorded previous digests.
  Existing cleanup preserves the immediate previous images and all images used
  by any container; it does not retain every historical release indefinitely.
- Current API readiness is a JSON HTTP 401 from `/api/locations/` without a token.
  Use the explicit HTTPS final URL, or loopback HTTP if its Host is allowed.
  Redirects/HTML/HTTP 200/5xx do not pass. No account login or record mutation is
  used. Django SQL `SELECT 1` and Redis ping also must pass before downtime.

Copy and owner-review `deployment-policy.example.json` as
`/opt/app/deployment-policy.json` (mode 0600; no group/world write). Verify the
worker node name and Beat schedule path against actual commands. The default
Beat check supports Celery's persistent scheduler; a different scheduler requires
an explicitly reviewed readiness adapter. No production scheduler was changed.

## Database/media backup prerequisite

Deployment **verifies existing backups; it does not create a production backup,
restore a database, or certify off-server storage automatically**. Before release:

1. Take a coordinated cohort with all application writers paused: PostgreSQL 16
   custom-format dump, private-media archive (plant and journal photos), public
   catalogue-media archive, and the canonical current rendered Compose hash.
   Keep DB, Redis and proxy running. Account for any external writers. Restart
   only after the snapshot is complete if the release is not immediate.
2. Copy the cohort encrypted off-server and verify its bytes. Restore the dump
   into a separate disposable PostgreSQL 16 instance, verify record/relationship
   counts, restore media into scratch storage and verify photo references/access.
   Do not rehearse by overwriting production. The existing CI staging lane proves
   this procedure for synthetic data; it does not prove a real production backup.
3. Record the actual successful rehearsal and off-server verification receipt.
   The receipt is a trusted operator attestation, not a signature or independently
   queried backup-provider proof. Never set its booleans to true without doing
   the work. Give the cohort directory mode 0700 and manifest/receipt mode 0600.
4. Put these existing files in a private cohort directory, with manifest matching
   the example below. Both snapshot and verification must be at most 24 hours old.
   Select a tighter release-window RPO operationally: data/media changes after
   the snapshot can be lost if that cohort must be restored.

`manifest.json` (replace every example value with measured evidence):

```json
{
  "created_at": "2026-11-20T12:00:00+00:00",
  "consistent_snapshot": "application-writers-paused",
  "configuration_sha256": "<canonical-current-compose-sha256>",
  "files": {
    "database": {"path": "database.dump", "sha256": "<sha256>"},
    "private_media": {"path": "private-media.tar.gz", "sha256": "<sha256>"},
    "public_media": {"path": "public-media.tar.gz", "sha256": "<sha256>"}
  },
  "restore_receipt": "restore.json"
}
```

`restore.json` records `verified_at` (UTC/offset ISO timestamp), `postgres_major`
16, `files` containing the same three measured SHA-256 values keyed by database,
private_media and public_media, and actual true results for
`restored_to_isolated_database`, `record_counts_verified`,
`media_references_verified`, `off_server_copy_verified`.

For the configuration hash, privately capture `docker compose -f
docker-compose.prod.yml -f docker-compose.private-media.json -f
docker-compose.release.json config --format json` (omit only overlays not yet
present). Hash the parsed object using `release_safety.configuration_hash`;
do not hash raw pretty-print whitespace. Rendered configuration contains secrets:
never print it to CI or upload it as a GitHub artifact. Configuration changes
after the cohort invalidate the hash and require a new reviewed backup cohort.

The deployer streams file hashes, verifies PGDMP format magic, reads media archives
without extraction, rejects traversal/links, and matches the recent restore/offsite
receipt. Missing, corrupt, mismatched, stale or inconsistent backups block before
pulling an image or pausing writers. A valid receipt remains an operator trust
boundary; this is deliberately documented rather than represented as an automated
production restore check.

## Approved backend release

Only after separate release approval:

1. Select **Deploy backend (VPS)**, ref **main**. Enter its full 40-character SHA
   in `revision` and `DEPLOY BACKEND <same-sha>` in `confirmation`. A ref other
   than main, changed SHA or non-owner initiator/rerunner is rejected.
2. Wait for the full backend quality suite; review/approve `production-backend`.
   The protected job revalidates authorization before registry/SSH operations.
3. The job builds the exact revision, pushes only its SHA tag, and passes the
   resulting immutable digest. The VPS rejects a pulled SHA tag with a different
   digest. There is no mutable `latest` publication in the new workflow.
4. A host lock serializes the whole read/configuration/deployment sequence.
   Preflight verifies current readiness, capacity and backup evidence. A private
   0700 history directory stores mode-0600 configuration/rollback metadata before
   writers stop. Config snapshots contain secrets and stay on the host.
5. Run lightweight image/model validation, stop application writers, migrate with
   the pinned new image, then start **web -> worker -> Beat**, requiring readiness
   before continuing. Existing web startup may repeat an idempotent migrate.
   SQL/Redis, API auth boundary, destination-specific worker ping, clean Beat
   startup logs/fresh scheduler file, container health and a final full pass are
   required. Readiness polling never retries migrations or start commands.
6. Review the run and host record:
   `/opt/app/.flovers-deployments/<run>-<attempt>-<sha>/manifest.json`.
   It records previous image IDs/digests/service names, private configuration
   snapshot/hash, backup evidence, candidate digest and last phase. File writes
   are atomic and fsynced. Do not attach its private snapshot to public issues.
7. For ordinary subsequent recreation use all persistent overlays:

```sh
cd /opt/app
docker compose -f docker-compose.prod.yml -f docker-compose.private-media.json \
  -f docker-compose.release.json up -d --no-build --pull never --no-deps web
```

Then start worker and Beat separately with the same files and verify each.
Never recreate services using only the base Compose file: it may still name an
old mutable tag. Verify the existing host's scheduled/manual restart commands
use these files before approving the first hardened release.

## Failure decisions and rollback

- **Preflight/pull/image check fails:** old writers stay running; no migration.
- **Stop/migrate fails:** abort; never restart old writers automatically against
  a potentially partly migrated schema. Investigate the recorded failed phase.
- **Web/worker/Beat start or final readiness fails:** stop partially started
  application services; retain metadata, pinned overlay, images, DB and media.
  If the emergency stop itself fails, report that and stop remaining writers
  manually before recovery. Infrastructure is not stopped or deleted.
- **Cleanup fails after readiness:** emit maintenance warning, keep healthy release.

Owner chooses forward repair or rollback. Check the 14 migrations with no-op
reverse handlers in [the migration safety assessment](../staging/README.md).
Do not equate Django reversing migration state with restoring those records.
Keep writers stopped throughout recovery.

If schema/data compatibility is explicitly demonstrated, construct a private
recovery override mapping each recorded service to its **previous image ID or
digest**, combined with the saved `previous-compose.json`; do not trust a mutable
tag inside that snapshot. Start web, verify, then worker, then Beat.

If compatibility is uncertain, restore the paired database/media cohort first.
Prefer a new PostgreSQL database and fresh media volumes while retaining failed
ones for investigation, verify row counts/references/permissions, then point the
private previous configuration at the restored cohort and recorded images. This
requires sufficient capacity or an off-host recovery instance. This PR performs
no DROP, volume removal, media deletion, automatic database restore or automatic
application rollback. A separate owner-approved recovery action is necessary.

After recovery, verify SQL/Redis, API auth boundaries, authorized read-only smoke,
photo access, worker/Beat readiness, current image identities and proxy/TLS.
Monitor before allowing writes again. Preserve evidence and record the RPO loss
if any; do not delete old volumes as part of cleanup.

## Approved website publication and recovery

Select **Deploy web (GitHub Pages)** on main. Provide the exact SHA and
`PUBLISH WEBSITE <same-sha>`. CI, locked installation, build, and entry-asset
verification occur before environment review. The site includes `release.json`
with revision, run ID and per-file hashes; the verified full artifact is retained
30 days. Only the reviewed `github-pages` job has Pages/OIDC write permissions.
It rechecks authorization and publishes the verified artifact, recording the SHA
in the run summary and GitHub environment deployment history.

Verify the public `release.json`, key pages and languages after an approved
publication. For recovery, the owner may rerun a previous successful **hardened
manual** publication run for its captured main revision, after inspecting that
run's code and obtaining fresh environment approval. A revert PR followed by a
new approved main publication is the preferred long-term repair. Retain verified
site artifacts/offline backups before the 30-day expiry. Do not rerun a legacy
automatic Pages workflow as a recovery shortcut.

## Verification scope

All new release logic is tested with synthetic event/configuration/backup files,
mocked Docker/HTTP/provider calls and strict workflow-structure mutation checks.
All existing backend/mobile/contracts/firmware/browser/native/staging gates still
run. Staging remains disposable. No production workflow is dispatched by tests,
and no production environment is created by a PR run. Actual approval UX, the
VPS's untracked Compose/proxy, real backup/restore, disk headroom and production
readiness must be separately verified before authorizing the first release.
