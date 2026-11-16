# Automated quality checks

| Workflow | Automatic execution | Checks | Publication |
| --- | --- | --- | --- |
| Backend quality checks | Backend/deployment PRs; called by every backend deploy | Hashed dependency lock, compatibility check, real CPU recognition smoke test, full pytest suite on PostgreSQL 16, model/migration checks, deployment safeguards | None |
| Website quality checks | Website PRs; called by every website deploy | ESLint, Node content/translation tests and Vite production build | None |
| Mobile quality checks | Mobile pushes and PRs; called before a manual Play release | Strict TypeScript, ESLint, full Jest suite and build-info Node tests | None |

Each check workflow can also be run manually with `workflow_dispatch`. Backend
and website image/artifact builds depend on their successful quality job. Manual
Play publication depends on the mobile job. Failures prevent downstream release
jobs; test jobs have read-only repository access and do not inherit deployment,
SSH or Play signing credentials. The Play workflow still has only a manual trigger.

Checks pin Ubuntu 24.04 rather than following automatic runner-image migrations.
Official checkout/setup/report actions use their Node 24 runtime releases.

Backend uses Python 3.12.16 and the same hashed `backend/requirements.txt` as the
production Docker image. Both install wheels only and run `pip check`. Before
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

Backend JUnit and mobile Jest JSON reports are retained for seven days, including
when a suite fails. Test uploads are diagnostic artifacts, not app publications.

## Run locally

```sh
# From backend (SQLite fallback; use the CI PostgreSQL URL below to test locks)
python -m pip install --require-hashes --only-binary=:all: -r requirements.txt
python -m pip check
python scripts/check_recognition.py
DJANGO_SETTINGS_MODULE=app.ci_settings python manage.py makemigrations --check --dry-run --skip-checks
DJANGO_SETTINGS_MODULE=app.ci_settings python -m pytest
# To exercise PostgreSQL, set CI_DATABASE_URL to a disposable local instance:
# postgres://flovers_ci:flovers_ci@127.0.0.1:5432/flovers_ci

# From mobile
npm ci
npm run typecheck
npm run lint
npm test -- --ci --maxWorkers=2
npm run test:build-info

# From web
npm ci
npm run lint
npm test
npm run build
```

On PowerShell, set variables with `$env:DJANGO_SETTINGS_MODULE='app.ci_settings'`
and `$env:CI_DATABASE_URL='...'` before the Python commands. CI settings allow only
the loopback database named `flovers_ci`, never an existing application database.
Use a dedicated disposable PostgreSQL instance and user with permission to create
the Django test database. Backend tests require the application dependencies and
checked-in recognition weights described in the main README.
