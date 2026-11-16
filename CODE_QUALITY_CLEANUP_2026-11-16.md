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
