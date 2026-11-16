# Flovers code quality review

Date: 2026-11-15. Reviewed local revision: `6fc386168654d2e0b57097e7ef50291972fbfc25`.

Scope: Django backend, React Native mobile application, React website, and their quality workflows. This is a source review with local automated checks, not an exhaustive security audit or a device/iOS certification. No application code was changed during the review.

## Assessment

The project has a useful architectural foundation and substantial automated coverage. It does not need a rewrite. However, code quality is uneven: mobile screens have accumulated responsibilities and repeated workflows, static checking is currently failing, and some errors are hidden behind successful empty results. Those are practical maintenance problems, not merely formatting preferences.

The strongest existing patterns include centralized sharing permissions, server-side XP accounting, invitation delivery jobs, secure token storage, API services, and shared modal infrastructure. The next improvement should be consolidating these patterns and making checks enforce them, rather than introducing more architectural layers everywhere.

## Findings, in priority order

### R1 — High: passing CI does not mean the mobile TypeScript is valid

The current mobile check runs Jest and release-metadata tests, but neither TypeScript nor ESLint. The website check runs tests and a production build, but not ESLint.

Measured locally:

- Mobile TypeScript: **254 diagnostics**, including 243 under application source and 11 under tests.
- Mobile ESLint: **79 errors and 942 warnings**.
- Website ESLint: **6 errors**.

The lint warnings are not all defects; many concern inline styling. Type errors also vary in significance. Nevertheless, this is not just cosmetic noise. For example, the scanner destructures `openSettings` from `useCameraPermission()`, while the installed VisionCamera hook exposes only `hasPermission` and `requestPermission`. The denied-permission screen therefore passes an undefined handler to its “Open Settings” button. TypeScript identifies this mismatch. The appropriate action is React Native's settings-opening API.

Another example is the edit-plant suggestion list referencing `suggestBox`, `suggestItem`, and `suggestText`, which are absent from its imported stylesheet. These references produce undefined styles at runtime.

Sources:

- [Mobile CI](.github/workflows/test-mobile.yml#L34), [website CI](.github/workflows/test-web.yml#L29).
- [Scanner hook usage](mobile/src/features/scanner/pages/ScannerScreen.tsx#L93), [button handler](mobile/src/features/scanner/pages/ScannerScreen.tsx#L357).
- Installed dependency API inspected at `mobile/node_modules/react-native-vision-camera/src/hooks/useCameraPermission.ts`.
- [Edit-plant suggestion styles](mobile/src/features/plants/components/modals/EditPlantModal.tsx#L255).

Recommended correction: fix runtime/API mismatches first, remove obsolete files, and work down the remaining TypeScript errors. Then require `tsc --noEmit` and ESLint errors in CI. Until the baseline is clean, prevent new errors rather than disabling strict checking or suppressing the entire backlog. Treat stylistic warnings separately.

### R2 — Medium: Plant Details converts failed requests into misleading empty data

The details service catches every device-list failure and returns an empty list. It does the same for task retrieval. The composite then treats an empty device list as “no linked device” and an empty task list as “no tasks.” A network or server failure can therefore look like a valid business state.

This is a remaining exception to the improved loading/error handling on the main list screens. The separate 24-hour-summary fallback is more reasonable: it deliberately preserves latest readings when an optional summary is unavailable.

Sources: [device fetch fallback](mobile/src/api/services/plant-details.service.ts#L129), [task fetch fallback](mobile/src/api/services/plant-details.service.ts#L168), [composite construction](mobile/src/api/services/plant-details.service.ts#L199), [no-device UI](mobile/src/features/plant-details/pages/PlantDetailsScreen.tsx#L1059).

Recommended correction: distinguish loading, loaded-empty, loaded-data, and failed states for each section. Display a retryable error when device/task loading fails; do not report that the underlying records do not exist.

### R3 — Medium: asynchronous request protection is inconsistent

Plants and Plant Details use local focus-effect flags, but their fetch helpers update component data before the caller checks those flags. If a user leaves and returns, or changes the selected plant while an earlier request remains in flight, an older response can overwrite newer data.

This is a code-level race risk, not a device reproduction from this review. Notifications already has a better pattern: request generations are checked before committing results. Home also deduplicates concurrent loads, which is useful, but there is no consistent shared policy across screens.

Sources:

- [Plants state updates](mobile/src/features/plants/pages/PlantsScreen.tsx#L332), [focus lifecycle](mobile/src/features/plants/pages/PlantsScreen.tsx#L448).
- [Plant Details state updates](mobile/src/features/plant-details/pages/PlantDetailsScreen.tsx#L306), [focus lifecycle](mobile/src/features/plant-details/pages/PlantDetailsScreen.tsx#L703).
- [Notifications request-generation protection](mobile/src/features/notifications/pages/NotificationsScreen.tsx#L69).

Recommended correction: reuse a small, typed request-lifecycle helper with generation/session checks and cancellation where supported. Guard the actual state update, not just the final spinner update. Add a deferred-response test in which the older request finishes last.

### R4 — Medium: screen controllers and repeated workflows weaken single responsibility

Several screens combine fetching, mapping, navigation, editing, upload handling, scheduling, modal state, and presentation:

| File | Lines |
| --- | ---: |
| Mobile Readings screen | 1,720 |
| Mobile Plant Details screen | 1,469 |
| Mobile Home screen | 1,245 |
| Mobile Plants screen | 1,162 |
| Backend readings views | 1,657 |

Length alone does not establish a defect. The more useful evidence is repeated responsibility: plant-editing workflows appear in both Plants and Plant Details, while watering-schedule state and handlers appear in both Readings and Plant Details. The modal component is reused, but the orchestration around it is repeated.

The backend readings module similarly mixes device API actions, pump scheduling, ingestion, history queries, spreadsheet creation, and email/export coordination. Those responsibilities change for different reasons.

There is also dependency leakage: API services import presentation types from feature folders. This makes UI-model changes affect the data layer and encourages casts when contracts drift.

Sources:

- [Plants editing](mobile/src/features/plants/pages/PlantsScreen.tsx#L374), [Plant Details editing](mobile/src/features/plant-details/pages/PlantDetailsScreen.tsx#L409).
- [Readings watering workflow](mobile/src/features/readings/pages/ReadingsScreen.tsx#L644), [Plant Details watering workflow](mobile/src/features/plant-details/pages/PlantDetailsScreen.tsx#L524).
- [Spreadsheet generation in views](backend/readings/views.py#L143), [device viewset](backend/readings/views.py#L508), [ingestion](backend/readings/views.py#L904), [history](backend/readings/views.py#L1369).
- [API service importing feature types](mobile/src/api/services/home.service.ts#L10), [Plant Details service imports](mobile/src/api/services/plant-details.service.ts#L8).

Recommended correction: extract shared `usePlantEditor` and `useWateringSchedule` workflows, keep screen-specific rendering separate, and place API contracts/domain types outside presentation folders. Move backend pump operations, history queries, and export construction into focused modules while preserving transaction and permission behavior. Do this in small, independently tested changes.

### R5 — Medium: the theme compatibility layer makes styling behavior implicit

The light theme intercepts native styles and maps literal color values according to RGB ranges, alpha, surrounding contrast context, and overlay geometry. It also wraps native components using broad `any` types and casts them back to the original native types.

This was a practical way to introduce light mode across an existing app. However, a developer adding a literal color cannot easily predict its final light-mode appearance from the component itself. Special cases for overlays and glass tints make future visual changes harder to reason about.

Sources: [style transformation](mobile/src/shared/theme/native.tsx#L6), [native component wrapper](mobile/src/shared/theme/native.tsx#L41), [color mapping rules](mobile/src/shared/theme/palette.ts#L86).

Recommended correction: use explicit semantic tokens such as surface, text, muted text, accent, disabled, and overlay for new/refactored components. Retain the compatibility layer during migration. Verify representative screens and modals in both themes before removing old mappings; do not replace the whole theme system in one change.

### R6 — Medium: Plant Details assembles a single-plant view from whole collections

Opening one plant loads its details, fetches the visible device collection, and calls the Home service. The Home service separately loads pending tasks, reminders, and plants, then joins them on the client. Plant Details filters that result down to the selected plant. A linked device adds a summary request, and a linked definition adds another request.

That is up to six logical API requests before the optional definition request, potentially more where collection helpers paginate. This is unnecessary coupling between a single-plant screen and collection-level data. It is a performance/maintenance issue, not evidence of an authorization leak.

Sources: [Plant Details collection filtering](mobile/src/api/services/plant-details.service.ts#L150), [Home collection join](mobile/src/api/services/home.service.ts#L14), [summary request](mobile/src/api/services/plant-details.service.ts#L212), [definition request](mobile/src/features/plant-details/pages/PlantDetailsScreen.tsx#L318).

Recommended correction: provide plant-scoped device/task queries or a dedicated Plant Details read response. Keep response types explicit and invalidate the affected resource after mutations. The recently paginated Task Journal is a good direction to continue.

### R7 — Medium: backend dependency resolution is not reproducible

Python dependencies mostly have lower bounds only; several, including Torch and TorchVision, have no version constraint. The Docker build and CI resolve them independently. The same application commit built on two dates can therefore receive different framework or binary-library versions.

The explicit CPU-only Torch installation is valuable and should remain. The problem is version reproducibility, not that safeguard. Mobile and web already use lockfiles with `npm ci`.

Sources: [backend requirements](backend/requirements.txt#L1), [Docker dependency installation](backend/Dockerfile#L16), [CI dependency installation](.github/workflows/test-backend.yml#L57).

Recommended correction: maintain a resolved Python dependency lock, including a tested CPU Torch/TorchVision combination, and use the same resolution in CI and production builds. Update dependencies through deliberate, tested changes rather than allowing unrelated deploys to resolve new versions.

### R8 — Low: obsolete components remain after replacement implementations

Some older components have no production references and still depend on removed exports/styles:

- `PopularPlantsList.tsx` imports the missing `PlantOption` type.
- `StepperHeader.tsx` imports missing `wizard` and `TOTAL_STEPS` exports.
- `WizardFooter.tsx` references removed footer styles.
- `PlantJournalModal.tsx` remains after the journal redirect; references found outside its definition are test scaffolding/exclusions rather than active UI usage.

These files make the repository misleading and contribute to static-check failures. They do not establish that those broken components are executed in the current application.

Sources: [old popular list](mobile/src/features/create-plant/components/PopularPlantsList.tsx#L6), [old stepper](mobile/src/features/create-plant/components/StepperHeader.tsx#L3), [old footer](mobile/src/features/create-plant/components/WizardFooter.tsx#L19), [old journal modal](mobile/src/features/plants/components/modals/PlantJournalModal.tsx#L80), [stale journal mock](mobile/src/shared/ui/__tests__/PlantScreenPhotoLoading.test.tsx#L55).

Recommended correction: remove verified unused components and their obsolete test scaffolding. Do not remove native dependencies merely because a text search finds no JavaScript import; inspect native/build usage separately.

### R9 — Low: website packaging eagerly includes every language and large screenshots

The i18n entry file statically imports the language/namespace resources. The production build produces a main JavaScript asset of approximately **2.60 MB**, or **727 KB gzip**. Four feature screenshots are approximately **1.41–1.89 MiB each**, while the feature layout renders them at a maximum CSS width of 260 pixels.

This is a clear optimization opportunity, although this review did not measure real-user network timings. Not every screenshot is necessarily fetched at the same moment.

Sources: [eager locale imports](web/src/i18n/index.js#L7), [screenshot imports](web/src/routes/Home/components/FeatureGrid.jsx#L13), [rendered width](web/src/routes/Home/components/FeatureGrid.css#L85).

Recommended correction: load the active language and route namespaces on demand; resize/compress screenshots for their actual display size with suitable high-density variants. Preserve transparency. Measure the resulting bundle and visual quality before changing more assets.

## SOLID and other patterns

| Principle | Current assessment | Practical action |
| --- | --- | --- |
| Single responsibility | Good in several backend domain modules; weak in large mobile controllers and readings views. | Extract workflows and query/export services around actual responsibilities. |
| Open/closed | Mixed: feature additions often require edits in several mappings and screens. | Use small shared registries where the same task-type metadata is repeated; do not force every switch into a framework. |
| Liskov substitution | Not a major organizing concern in this predominantly functional React/Django code. | Avoid introducing inheritance merely to satisfy a checklist. |
| Interface segregation | Broad objects and loosely typed props exist, especially around theme wrappers and screen orchestration. | Prefer focused typed contracts as components/services are extracted. |
| Dependency inversion | API services and permission helpers provide useful boundaries, but API-to-feature type imports weaken the direction. | Separate transport/domain contracts from presentation models. |
| DRY | Shared modals/toasts are progress; editing, scheduling, loading, and older components still repeat. | Consolidate behavior that must change together; keep unrelated forms separate. |
| KISS | The existing stack is appropriate for this project. | No microservices, app rewrite, or interfaces/classes for every function are needed. |

Examples worth retaining:

- [Central sharing-access checks and locking](backend/sharing/permissions.py#L65).
- [Server-side XP accounting](backend/profiles/progression.py#L58).
- [Invitation delivery claims and retries](backend/contacts/tasks.py#L25).
- [Secure authentication storage](mobile/src/api/services/auth.storage.ts).
- [Shared modal layout](mobile/src/shared/ui/AppModalFrame.tsx).
- [Shared completion-toast formatting](mobile/src/shared/utils/taskCompletionToast.ts).

## Verification performed

| Check | Result |
| --- | --- |
| Mobile Jest suite | 128 suites, 943 tests passed. |
| Backend pytest suite | 1,081 passed, 36 skipped. |
| Django system check | Passed. |
| Django migration consistency | No changes detected. |
| Website tests | 66 passed. |
| Website production build | Passed; large-chunk warning. |
| Mobile TypeScript | Failed: 254 diagnostics. |
| Mobile ESLint | Failed: 79 errors, 942 warnings. |
| Website ESLint | Failed: 6 errors. |

The local backend run used the isolated test environment with SQLite and an inference stub that requires recognition calls to be mocked. The skipped tests include database-specific coverage; this is not equivalent to rerunning the PostgreSQL CI suite or real ML inference. Native Android/iOS execution, device permissions, and production concurrency were not exercised. Passing tests therefore do not cancel the findings above.

## Suggested cleanup sequence

1. Fix the scanner action and missing styles; remove obsolete components; establish a clean TypeScript baseline and enforce static checks in CI.
2. Correct error-versus-empty handling and unify stale-request protection, with targeted failure/race tests.
3. Extract the repeated plant-editing and watering workflows, then separate backend readings query/export responsibilities.
4. Lock Python dependencies and move refactored UI toward semantic theme tokens, with focused light/dark visual checks.
5. Optimize website locale loading and screenshots, measuring the result.

Avoid combining these steps with new features or a redesign. Smaller behavior-preserving changes will be easier to verify against the substantial test coverage already present.
