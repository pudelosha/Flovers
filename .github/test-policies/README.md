# Required tests and skipped-test policy

Quality summaries enforce these policies after reading the real test reports.
No coverage percentage threshold is introduced.

- `backend.json` requires all 13 PostgreSQL concurrency cases and 21 host C++ cases to be collected and
  pass. Missing, renamed, deselected, skipped, failed or errored required cases
  make the job fail. The preflight also checks a live connection to the isolated
  `flovers_ci` PostgreSQL database, so SQLite cannot silently replace it.
- `backend.json` allows no skips. The backend lane selects non-firmware cases;
  no existing test is deleted.
- `firmware.json` requires both generated ESP32-C3 Arduino preprocessing builds
  and allows no skips. Their historical exceptions were removed after successful
  independent hosted builds. See [firmware setup and evidence](../../firmware/ci/README.md).
- `no-skips.json` rejects all skipped and TODO cases in mobile and website CI.

These checks do not claim that mocks are full-stack tests or replace a real
Linux/PostgreSQL baseline. CI still runs the complete existing suites. Local
SQLite runs can generate diagnostic summaries without `--policy`; applying the
backend CI policy to SQLite must fail, since it cannot exercise PostgreSQL locks.

When intentionally renaming a required test, update its exact identity in the
same reviewed change. Do not remove it merely to make a failing check green.
New skip exceptions require a specific identity, exact reason and explanation;
avoid broad patterns or blanket permission to skip database/compiler cases.

Changes to policies or reporting tools trigger all quality workflows, without
starting a deployment or mobile publication. Backend changes also trigger client
checks; mobile API/type changes trigger backend checks. This catches regressions
in the existing independent suites. The additional
[provider-verified contract lane](../../contracts/api/README.md) verifies current
and previous-supported mobile adapters against actual Django responses.
