# Required tests and skipped-test policy

Quality summaries enforce these policies after reading the real test reports.
No coverage percentage threshold is introduced.

- `backend.json` requires all 13 PostgreSQL concurrency cases to be collected and
  pass. Missing, renamed, deselected, skipped, failed or errored required cases
  make the job fail. The preflight also checks a live connection to the isolated
  `flovers_ci` PostgreSQL database, so SQLite cannot silently replace it.
- Every backend skip must match an exact test identity **and** exact reason.
  The only current exceptions are the two Arduino preprocessing builds, pending
  their dedicated ESP32 toolchain lane. Each exception states its justification.
  No PostgreSQL or host C++ skip is allowed. The existing tests remain unchanged.
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
in the existing independent suites, but is not yet a provider-verified wire
contract suite (that remains later work).
