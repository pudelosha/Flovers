# Mandatory PR verification

`ci-main.yml` runs the complete existing matrix for every pull request, including
main, stacked review branches and docs-only changes. There are no PR path/branch
filters, skip inputs, production secrets or publication jobs. Required checks are:

```text
ci/backend
ci/mobile
ci/web
ci/contracts
ci/celery
ci/firmware
ci/browser
ci/android
ci/staging
ci/release-readiness
```

The first nine gates validate both the reusable workflow result and every required
internal job result. `ci/browser` and `ci/android` share one native/browser execution
bundle, so a failure anywhere in that bundle fails both gates. They do not build or
run Android twice. The last gate requires all nine plus coordinator policy success.
`if: always()` makes dependency failure/skipping visible; cancellation or absent
evidence can never produce a success. A platform-wide cancellation can leave checks
cancelled/pending, which must block merging rather than be treated as a pass.

Reusable suites expose `${{ toJSON(jobs) }}` as `job_results`. Missing jobs, missing
outputs, malformed evidence, non-success results and unexpected job IDs fail closed.
Existing JUnit/Jest skip policies and required cases remain intact. Changing a
suite's job graph requires updating the policy manifest and reviewing its tests.
No coverage threshold or application dependency is changed. PyYAML 6.0.3 is a
hash-pinned policy-only dependency; evaluation gates use the standard library.

Standalone suite workflows retain push/manual feedback and production workflow-call
support. Their previous PR triggers are replaced by the coordinator to avoid running
each suite twice on the same PR event. Backend/mobile/web suite display names are
unique; only final coordinator gates use `ci/*`. Production deployment definitions
and the manual Play publication workflow are unchanged.

The coordinator policy checks trigger coverage, exact check names, dependency graph,
reusable outputs, absence of skip/secret inputs and unchanged exit-status propagation.
Regression tests cover every lane, aggregate failure, failed/cancelled/skipped/timed-out
dependencies, missing jobs/outputs and malformed/duplicate JSON. It does not prove
security against an administrator deliberately replacing both the policy and tests.

## Ruleset proposal, not activation

Require the ten exact names above from GitHub Actions (observed integration ID 15368).
Keep strict up-to-date PRs, zero mandatory reviewer approvals for the sole owner,
resolved conversations, blocked direct/force pushes and deletion, merge-commit support
and no standing bypass. Settings are deliberately not changed by this implementation.
Observe the real emitted names and successful docs-only/failure validation before
applying a separately approved ruleset. An invalid workflow or runner outage fails
closed; it cannot be guaranteed to report a completed check during an outage.

## Verification without a main merge

A main-targeted candidate PR proves the trigger against actual main. A true docs-only
PR uses an isolated candidate base containing this unmerged workflow; unchanged main
does not yet contain the coordinator, so pretending a CI-plus-stack diff is docs-only
would be misleading. No branch or path filtering distinguishes those PR bases.
Negative fixtures belong only on isolated validation branches and must never be merged.
Production services, credentials, devices and publication workflows are not used.
