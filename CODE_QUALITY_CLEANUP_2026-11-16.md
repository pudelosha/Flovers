# Code quality cleanup: stages 1–3

Branch: `maintenance/code-quality-2026-11-16`.

Starting revision: `6fc386168654d2e0b57097e7ef50291972fbfc25`.

The [review](CODE_QUALITY_REVIEW_2026-11-15.md) records the source findings. This cleanup addresses the agreed baseline, concrete defects, obsolete code, TypeScript errors, and lint errors. Larger workflow refactors, theme migration, dependency locking, and website payload optimization remain outside these stages.

## Recorded baseline

The starting source matches the revision checked in the review. Existing generated mobile build metadata and unrelated translation/image drafts are excluded from cleanup commits.

| Check | Baseline |
| --- | --- |
| Mobile Jest | 128 suites; 943 tests passed |
| Backend pytest | 1,081 passed; 36 skipped |
| Django checks/migration consistency | Passed; no missing migrations |
| Website tests/build | 66 tests passed; production build passed |
| Mobile TypeScript | 254 errors |
| Mobile source ESLint | 79 errors; 942 warnings |
| Website source ESLint | 6 errors |

The backend baseline used SQLite and mocked recognition inference. It does not replace PostgreSQL concurrency tests or native-device validation.

## Acceptance criteria

- Camera settings action uses an API supplied by the installed dependencies.
- Edit-plant suggestions have real styles.
- Failed Plant Details requests remain failures, rather than reporting empty business data.
- Older screen requests cannot commit state after replacement or loss of focus.
- Regression tests exercise unavailable data and out-of-order responses.
- Verified unused components and obsolete test scaffolding are removed.
- TypeScript strict checking remains enabled and passes.
- Mobile and website lint errors are resolved without blanket suppression.
- Static checks run in the existing quality workflows and do not publish mobile builds.
- Relevant existing suites continue to pass.

Each stage is committed separately. Nothing is pushed or deployed as part of this cleanup request.

## Stage 2: concrete defects

- Scanner denied-permission action now opens system settings through React Native.
- Edit-plant suggestions use defined styles.
- Plant Details preserves device/task request failures and rejects malformed device collections. Successful empty results and the optional 24-hour-summary fallback remain supported.
- Home, Plants, Plant Details, Reminders, Readings, and Locations invalidate data requests on loss of focus and ignore superseded responses. Home retains in-flight deduplication within a visit.
- Added permission-action, unavailable-data, unmount, revisit, and out-of-order response regression coverage.
- Targeted verification: six Jest suites, 36 tests passed.

## Stage 3: static checking and obsolete code

- Removed the unused PopularPlantsList, StepperHeader, WizardFooter, and former PlantJournalModal, including stale test mocks/exclusions.
- Replaced untyped translation interpolation arguments with typed records, preserving runtime translation behavior. Corrected wizard option contracts, scanner IDs/permissions, navigation arguments, QR callback narrowing, and test prop types.
- Removed unused imports, helpers, state, and destructured inputs. Removed unsupported navigation/checkbox props that the installed component APIs do not expose.
- Made hook inputs explicit. Dialog defaults are captured per opening so contact/plant-list refreshes do not overwrite unsaved form input; the private-photo loader remains keyed by photo identity/URL rather than object allocation. Header labels/segments use a stable presentation object.
- Added `npm run typecheck`. Existing mobile CI now requires strict TypeScript and mobile lint; website CI requires website lint. Mobile publication triggers are unchanged.
- ESLint ignores generated native/build/test artifacts and recognizes the modern JavaScript runtime. No source-wide rule suppression or weakening of TypeScript strict mode was added.

### Verification

| Check | Result after cleanup |
| --- | --- |
| Mobile TypeScript (`npm run typecheck`) | Passed; zero errors |
| Mobile ESLint (`npm run lint`) | Passed; zero errors |
| Mobile Jest | 130 suites; 953 tests passed |
| Release-metadata tests | 5 passed |
| Website ESLint | Passed; zero errors |
| Website tests | 66 passed |
| Website production build | Passed |
| Android production JavaScript bundle (Metro) | Passed |

Existing non-blocking mobile lint warnings remain, primarily inline styles and other style conventions, with additional warnings for nested render callbacks and some assigned-then-awaited test assertions. This stage establishes an error-free gate; it does not claim warning-free code. Website bundle-size optimization remains a later stage.

No backend application files, database models, or migrations changed. The prior backend baseline remains recorded above. Native APK/iOS builds and physical-device validation were not part of these local checks.
