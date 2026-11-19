# Automated quality checks

The separate [real Celery integration lane](../integration/celery/README.md)
adds disposable PostgreSQL 16, Redis, a non-eager prefork worker, Beat and SMTP
capture. It requires all 11 integration cases to pass with no skips and uploads
worker/Beat/service diagnostics. It does not change the fast suites, production
deployment gates or manual-only Play publication. See its README for safe local
execution and the covered failure/recovery boundaries.

| Workflow | Automatic execution | Checks | Publication |
| --- | --- | --- | --- |
| Backend quality checks | Backend/deployment PRs; firmware, mobile API/type and shared CI-tool/policy pushes/PRs; called by every backend deploy | Hashed dependency locks, PostgreSQL/compiler preflight, CPU recognition, non-firmware pytest/coverage, 34 required concurrency/host C++ cases, zero skips, migrations and deployment safeguards | None |
| Website quality checks | Website PRs; backend, mobile translations and shared CI-tool/policy pushes/PRs; called by every website deploy | ESLint, Node content/translation tests with imported-module coverage, no-skips policy and Vite production build | None |
| Mobile quality checks | Mobile/backend and shared CI-tool/policy pushes/PRs; called before a manual Play release | Strict TypeScript, ESLint, full Jest/coverage, no-skips policy and build-info Node tests | None |
| ESP32 firmware compilation | Generator/protocol, firmware lock, dependency, target and CI changes | Pinned isolated CLI/core/libraries, both generated C3 sketches, exact required test identities, zero skips, `.bin`/`.elf` artifacts | None |

Each check workflow can also be run manually with `workflow_dispatch`. Backend
and website image/artifact builds depend on their successful quality job. Manual
Play publication depends on the mobile job. Failures prevent downstream release
jobs; test jobs have read-only repository access and do not inherit deployment,
SSH or Play signing credentials. The Play workflow still has only a manual trigger.

Checks pin Ubuntu 24.04 rather than following automatic runner-image migrations.
Official checkout/setup/report actions use their Node 24 runtime releases.

Backend uses Python 3.12.16 and the same hashed `backend/requirements.txt` as the
production Docker image. CI additionally installs the hashed
`backend/requirements-ci.txt` reporting-tool lock, constrained to those same
application versions; the production dependency lock is unchanged. Both install
wheels only and run `pip check`. Before
application tests, a shared smoke script rejects GPU dependencies, exercises
TorchVision's native CPU operators, and runs a real prediction with the checked-in
model and class mapping. The image build repeats this check inside the release
image. See [backend dependencies](../backend/DEPENDENCIES.md) for lock maintenance.
Prediction API tests mock inference results where appropriate; no global
inference replacement is installed by CI. A disposable PostgreSQL service exercises row locks and the
PostgreSQL-only concurrency tests that SQLite skips. No Redis, SMTP, Firebase or
production database is required: test mail stays in memory, Celery runs eagerly
with an in-memory broker, and uploads use temporary storage. CI settings disable
dotenv loading and reject external/non-test database URLs. Python socket traffic
from tests is restricted to loopback. Cache state resets between tests so rate
limits do not leak from one case into the next.

JavaScript checks use Node 24 and lockfile-based `npm ci`. These checks exercise
application behavior; they do not build native APK/IPA files or publish a mobile
release. Strict TypeScript and lint errors are required gates; existing
non-blocking mobile lint warnings remain. Native device and iOS validation
remain separate checks.

## Coverage and skipped-test reports

The backend, mobile and website jobs append test counts and skipped cases to the
GitHub run's job summary. Backend and mobile summaries include separate line and
branch coverage, with covered/total counts. Missing or malformed reports are
reported as failures, never as a passing run. Failed assertions or suite import
errors also remain failures. Reports are generated and uploaded even when earlier
steps fail. Once dependency installation succeeds, mobile Jest/build-info and
website tests/builds still run after lint/typecheck failures to preserve diagnostic
results; those earlier failures continue to block deployment/publication.

- Backend coverage includes all backend Python source, including unimported
  modules, excluding tests, fixtures, migrations and `manage.py`. Configuration:
  `backend/.coveragerc`. Separate subprocess checks are not merged. JUnit lists
  each skipped test and its reason; pytest prints the skip summary with `-ra`.
- Mobile coverage includes all `src` TypeScript/TSX and `App.tsx`, including
  unimported files. Test directories, declarations and generated `buildInfo.ts`
  are excluded. Native Java/Kotlin/Swift/Objective-C is not measured.
- Website coverage is **imported-module coverage only**: currently config and
  contact-adapter JavaScript. Its percentages appear in the job log, with raw V8
  coverage in the artifact. It does not measure React routes or browser behavior
  and must not be presented as whole-website coverage.

The seven-day diagnostic artifacts contain:

| Component | Files |
| --- | --- |
| Backend | `test-results/backend.xml`, `coverage.json`, `coverage.xml`, `coverage-html/`, `summary.md` |
| Mobile | `jest-results.json`, `coverage/` (JSON, Cobertura XML, HTML), `test-results/summary.md` |
| Website | `test-results/web.xml`, `v8-coverage/`, `summary.md` |

Skipped cases are visible and governed by [.github/test-policies](test-policies/README.md).
Backend CI verifies a live connection to its isolated PostgreSQL service and
checks that `g++` is available. All 13 PostgreSQL concurrency cases must be
present and passed in the JUnit report; skipped, missing, renamed, deselected,
failed or errored required cases fail the job. Host C++ checks receive
`FLOVERS_TEST_CPP=g++`, so a missing compiler cannot silently skip them.

No backend skip is accepted. The two ESP32 target cases are required in the
dedicated firmware lane, while the normal backend lane selects non-firmware cases.
The exact 21 host C++ checks are required alongside the concurrency cases.
Mobile and website CI reject all
skipped/TODO cases. Local SQLite runs can still generate diagnostics without
`--policy`; applying the backend CI policy to SQLite deliberately fails. No new
coverage-percentage threshold is enforced until the Linux/PostgreSQL baseline is
verified. Do not delete required cases or broaden exceptions to make CI green.

Website consistency tests read mobile/backend translations, and its contact
adapter depends on the API. All `backend/**` changes now trigger mobile and
website quality checks; mobile API adapters and feature types trigger backend
checks. Mobile translation changes also trigger website consistency checks.
Shared `.github/scripts/**` and `.github/test-policies/**` changes trigger all
three quality workflows. These
extra triggers do not start VPS/Pages deployment or Play publication. Existing
deployment triggers and the manual-only mobile publication workflow are unchanged.
The reciprocal checks exercise existing suites; they are not yet a shared
consumer/provider wire-contract suite. Changes spanning several inputs may run
both standalone checks and the existing reusable deployment gates.

`report_tests.py` uses only the Python standard library; mobile/website jobs use
the Python 3 provided by the pinned Ubuntu 24.04 hosted runner. Its own unit tests
run in backend quality checks, and shared-tool pushes/PRs trigger those checks.
Test uploads are diagnostic artifacts, not app publications.

## Run locally

```sh
# From backend (SQLite fallback; use the CI PostgreSQL URL below to test locks)
python -m pip install --require-hashes --only-binary=:all: -r requirements.txt
python -m pip check
python scripts/check_recognition.py
DJANGO_SETTINGS_MODULE=app.ci_settings python manage.py makemigrations --check --dry-run --skip-checks
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest -m "not firmware_compile"
# For CI-equivalent reporting (application dependencies must already be installed):
python -m pip install --require-hashes --only-binary=:all: -r requirements-ci.txt
python -m pip check
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest -m "not firmware_compile" -ra --cov=. --cov-config=.coveragerc \
  --junitxml=test-results/backend.xml --cov-report=json:test-results/coverage.json \
  --cov-report=xml:test-results/coverage.xml --cov-report=html:test-results/coverage-html
python ../.github/scripts/report_tests.py --title 'Backend pytest' \
  --junit test-results/backend.xml --coverage test-results/coverage.json \
  --coverage-kind python --output test-results/summary.md
# Enforce the CI policy only with a dedicated PostgreSQL instance and host compiler:
# add --policy ../.github/test-policies/backend.json to the summary command.
# To exercise PostgreSQL, set CI_DATABASE_URL to a disposable local instance:
# postgres://flovers_ci:flovers_ci@127.0.0.1:5432/flovers_ci

# From mobile
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run test:build-info
python ../.github/scripts/report_tests.py --title 'Mobile Jest tests' \
  --jest jest-results.json --coverage coverage/coverage-summary.json \
  --coverage-kind jest --policy ../.github/test-policies/no-skips.json \
  --output test-results/summary.md

# From web
npm ci
npm run lint
npm test
# JUnit + imported-module coverage (use this instead of npm test for reporting):
npm run test:ci
npm run build
python ../.github/scripts/report_tests.py --title 'Website tests' \
  --junit test-results/web.xml --policy ../.github/test-policies/no-skips.json \
  --output test-results/summary.md

# From the repository root: reporting-tool unit tests
python -m unittest discover -s .github/scripts/tests -p 'test_*.py'
```

On PowerShell, set variables with `$env:DJANGO_SETTINGS_MODULE='app.ci_settings'`
and `$env:CI_DATABASE_URL='...'` before the Python commands. CI settings allow only
the loopback database named `flovers_ci`, never an existing application database.
Use a dedicated disposable PostgreSQL instance and user with permission to create
the Django test database. Backend tests require the application dependencies and
checked-in recognition weights described in the main README.

## Provider-verified API compatibility

`test-api-contracts.yml` adds an isolated PostgreSQL 16 provider job and a dependent
current/previous mobile adapter job. Both consume the same provider-verified response
artifact, pinned to the workflow commit. Required scenarios cannot silently skip.
See [contract design, matrix and local commands](../contracts/api/README.md).
The previous mobile baseline is `6f698097ddb17f7740dada6ce37beba1a28ff34e`.
This standalone check does not modify deployment workflows or branch protection.

## Required ESP32-C3 target compilation

`test-firmware.yml` installs a checksum-verified Arduino CLI 1.6.0, ESP32 core
3.3.12 and four exact direct/transitive sensor library versions. It compiles both
generated firmware variants using the existing C3/USB CDC target. Both exact JUnit
identities and `.bin`/`.elf` outputs are required; no skip exception remains.
Compiler/installation logs, sketches, binaries and target/lock provenance are uploaded.
See [pins, target configuration, commands and limitations](../firmware/ci/README.md).

The two Arduino cases run in the dedicated lane. The backend lane selects all
other tests with `-m "not firmware_compile"` and permits no skips. Its exact
required-case list now includes the 21 existing host C++ checks as well as the
13 PostgreSQL concurrency cases. No test was removed or weakened, and production
deployment workflows and mobile publication remain unchanged.

