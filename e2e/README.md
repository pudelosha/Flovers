# Native Android and browser smoke tests (P1-B)

These are additional, standalone CI checks. Existing fast checks and production
deployment/publication workflows are unchanged. Neither job uses a production
account, VPS, API, SMTP service, Firebase project or physical device.

## Locked execution environment

See [`toolchain.lock.json`](toolchain.lock.json) and the independent browser npm
lockfile. Android/Maestro archives are downloaded from their official publishers
and checksum-verified before extraction. Unexpected installed revisions fail.

- Ubuntu 24.04 GitHub-hosted runner with KVM required.
- Temurin JDK 17.0.17+10; Gradle 8.14.3 (existing application wrapper).
- Android command-line tools 19.0; platform tools 37.0.3; build tools 36.0.0;
  compile SDK 36; NDK 27.1.12297006; CMake 3.22.1.
- Emulator 37.3.10 (build 16970787), Android API 35 Google APIs x86_64 image
  revision 9, Pixel 2 profile, two cores, 2 GB RAM, headless SwiftShader/KVM.
- Maestro CLI **2.12.1**, no Cloud account, analytics or AI analysis.
- Playwright **1.65.1**, bundled Chromium **159.0.8154.6**, revision **1255**.
  Projects: desktop 1280x900 and mobile Chromium 390x844 with touch emulation.

## Required native journeys

`navigation-smoke` launches a freshly cleared app, signs in with a synthetic
account, checks Home and opens plant details through the task menu. It then
checks the Plants list and opens details from a plant tile, visits Reminders,
opens Readings/device details, navigates to Locations through the real FAB,
and logs out through Profile. The login form must return and tabs disappear.

`completion-smoke` uses a different synthetic account. It signs in, opens a
Home task's real completion dialog, confirms completion, verifies the old task
disappears, opens Task Journal and checks the completed tile. A separate Django
postcondition verifies task 902 was completed by account 502, while the other
account's task remains pending. These are actual API/database mutations, not
Jest or mocked navigation. No pump is configured or actuated.

Stable React Native `testID` selectors identify interactive controls and rows.
The one user-data text assertion uses the fixed synthetic note, independent of
translations. No screen coordinates, blanket retries, optional assertions or
conditional flow skips are used. Polling is limited to service/emulator/UI
readiness, with explicit deadlines.

## Isolation

The opt-in Gradle `-PfloversE2E=true` creates `assembleE2e` only, with application
ID `com.flovers.mobile.e2e`, known debug signing, release-matched native libraries and bundled real JS/Hermes. It
does not require Metro, release keys or Google services configuration. Default
debug and release behavior remains unchanged.

The E2E entry mounts the same App/navigation; Firebase background initialization
is omitted. E2E native manifest removes automatic Firebase initialization, and
the E2E-only config causes push registration/teardown to return before calling
Firebase. An Android OkHttp interceptor rejects external hosts before DNS/HTTP.
Redirect following is disabled for this isolated APK. A native runtime probe
checks the generated API endpoint and uses the actual client factory to reject
a non-routable `.invalid` URL before DNS. The native lane requires its log marker
and retains `network-isolation.json`; a missing/failed probe fails the lane.
The native API is fixed to `http://10.0.2.2:8000`, Android Emulator's documented
alias for the runner's loopback. It is not a LAN/VPS address and does not depend
on ADB reverse forwarding surviving a transport reconnect. The host API still
binds only `127.0.0.1:8000`; a required native APK probe verifies HTTP 200 using
the actual application client, without extra shell HTTP tools.
The policy allows only that exact HTTP origin and disables redirects. This configuration cannot silently fall back to a
production API if environment injection fails: external requests fail closed.

The server imports isolated CI settings and permits only the loopback
`flovers_ci` PostgreSQL 16 service (or in-memory SQLite for fixture unit tests).
It disables dotenv, real SMTP/broker/Firebase and external Python socket
connections. Seeder refuses a nonempty database or nonisolated settings. Media
exists only under disposable runner storage and includes synthetic JPEGs.
Two accounts, plants, reminders, tasks, devices and locations are created.
No external test reset/seed endpoints are exposed.

## Required browser scenarios

Five scenarios run in **both** viewport projects against the actual Vite build:

1. Homepage, root redirect, branding and every rendered hero image.
2. Real desktop/mobile menu navigation: Documentation -> Schemas -> FAQ -> Home.
3. EN -> PL -> EN language switching preserves the documentation route.
4. Terms, Privacy Policy and Contact navigation; contact email control; the
   current intentionally disabled store badges have no navigable destinations.
5. Responsive header/content, mobile menu and no horizontal page overflow across
   Home, Documentation, Schemas and FAQ.

The preview server binds `127.0.0.1:4173`. Browser routing blocks all external
requests before dispatch; no API/page responses are mocked. Required journeys
must render using local assets, with no uncaught browser exceptions. Store URLs
are currently empty, so external store navigation is not claimed as tested.

## CI visibility and failure handling

[`test-e2e.yml`](../.github/workflows/test-e2e.yml) has separate APK build,
Maestro and Playwright jobs, plus an always-running aggregate gate. Source,
translation, test, dependency and workflow changes select the checks.

The gate fails if a required job is failed or skipped. Reporting guards require
both named native flows and exactly the five browser scenarios in each viewport.
Missing reports, missing tooling, empty suites, duplicates and skipped required
cases fail. Existing zero-skip reporting also runs on both reports.

Artifacts (seven-day retention) include the debug-signed APK and checksum,
compiler/tool logs, actual Android properties, backend logs/postconditions,
Maestro JUnit/step artifacts, screenshots, final hierarchy/logcat, and browser
JUnit/HTML reports plus failure screenshots/videos/traces. No retry is configured.
Timings and hosted verification results are recorded in the review PR.

The E2E Gradle invocation supplies `android/repositories.init.gradle`. It adds
Maven Central's alternate canonical HTTPS endpoint only for the existing Gson
plugin classpath group, retaining requested versions and all standard project
repositories. This addresses observed false 404s without dependency upgrades,
HTTP retries, or changes to normal Android/deployment builds.

## Local browser and safeguard checks

```sh
npm --prefix web ci
npm --prefix web run build
cd e2e/browser
npm ci
npx --no-install playwright install chromium
npm test
cd ../..
python e2e/check_reports.py browser e2e-results/browser/results.xml
python -m unittest discover -s e2e/tests -p 'test_*.py'
```

For seed tests, use the locked backend environment, set `PYTHONPATH` to the root
and `backend`, and `DJANGO_SETTINGS_MODULE=e2e.android.settings`:

```sh
python -m pytest -c backend/pytest.ini e2e/android/test_seed.py
```

The native runner is intentionally Linux/KVM/emulator-specific. It always
addresses `emulator-5554` and never discovers or connects a physical phone.
Hosted CI is authoritative for its native execution result.

## Deliberate limits and known flakiness sources

This is a focused smoke suite: one Android API/ABI/profile, Chromium only,
English native UI and EN/PL website switching. It does not certify iOS, vendor
Android skins, all locales/themes, scanner/camera/sensor permissions, BLE/Wi-Fi
hardware/pumps, offline recovery, native sharing, full plant wizard, journal
photo capture or real email/push delivery. Account activation/recovery remain
covered by lower-level tests rather than native link journeys here.

Potential infrastructure failures include upstream SDK/Maven/browser downloads,
runner disk/memory pressure and emulator/driver startup. Versions/checksums,
separate build/boot/test diagnostics and bounded waits distinguish these from
application assertion failures; failures are not concealed by retries.
