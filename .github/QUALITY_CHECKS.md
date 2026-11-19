# Automated quality checks

| Workflow | Automatic execution | Checks | Publication |
| --- | --- | --- | --- |
| Backend quality checks | Backend/deployment PRs; shared CI-tool pushes/PRs; called by every backend deploy | Hashed dependency locks, compatibility check, real CPU recognition smoke test, full pytest suite with branch coverage on PostgreSQL 16, model/migration checks, deployment safeguards | None |
| Website quality checks | Website PRs; mobile/backend translation and shared CI-tool pushes/PRs; called by every website deploy | ESLint, Node content/translation tests with imported-module coverage and Vite production build | None |
| Mobile quality checks | Mobile and shared CI-tool pushes/PRs; called before a manual Play release | Strict TypeScript, ESLint, full Jest suite with coverage and build-info Node tests | None |

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

Skipped cases are visible, not silently counted as passes. Local SQLite skips
PostgreSQL concurrency checks. Firmware host checks require a C++ compiler and
ESP32 compilation requires `FLOVERS_TEST_ARDUINO_CLI`; this reporting change does
not provision those tools or add a skip allowlist. No new coverage-percentage
threshold is enforced yet. Review the reported baseline before adding gates.

Website consistency tests read `mobile/src/i18n/locales/**` and
`backend/i18n/locales/**`, so changes there now trigger website checks as well.
Shared `.github/scripts/**` changes trigger all three quality workflows. These
extra triggers do not start VPS/Pages deployment or Play publication. Existing
deployment triggers and the manual-only mobile publication workflow are unchanged.

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
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest
# For CI-equivalent reporting (application dependencies must already be installed):
python -m pip install --require-hashes --only-binary=:all: -r requirements-ci.txt
python -m pip check
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest -ra --cov=. --cov-config=.coveragerc \
  --junitxml=test-results/backend.xml --cov-report=json:test-results/coverage.json \
  --cov-report=xml:test-results/coverage.xml --cov-report=html:test-results/coverage-html
python ../.github/scripts/report_tests.py --title 'Backend pytest' \
  --junit test-results/backend.xml --coverage test-results/coverage.json \
  --coverage-kind python --output test-results/summary.md
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
  --coverage-kind jest --output test-results/summary.md

# From web
npm ci
npm run lint
npm test
# JUnit + imported-module coverage (use this instead of npm test for reporting):
npm run test:ci
npm run build
python ../.github/scripts/report_tests.py --title 'Website tests' \
  --junit test-results/web.xml --output test-results/summary.md

# From the repository root: reporting-tool unit tests
python -m unittest discover -s .github/scripts/tests -p 'test_*.py'
```

On PowerShell, set variables with `$env:DJANGO_SETTINGS_MODULE='app.ci_settings'`
and `$env:CI_DATABASE_URL='...'` before the Python commands. CI settings allow only
the loopback database named `flovers_ci`, never an existing application database.
Use a dedicated disposable PostgreSQL instance and user with permission to create
the Django test database. Backend tests require the application dependencies and
checked-in recognition weights described in the main README.
