import json
import os
from pathlib import Path

import pytest

from contracts.api.validation import BASELINE, ROOT, canonical, digest, manifest, validate_bundle

CASES = {}
OUTCOMES = []


def pytest_sessionstart(session):
    path = os.environ.get("CONTRACT_BUNDLE")
    if not path:
        raise pytest.UsageError("CONTRACT_BUNDLE must name a fresh output artifact")
    Path(path).unlink(missing_ok=True)


def pytest_runtest_logreport(report):
    if report.when == "call" or report.failed or report.skipped:
        OUTCOMES.append(report)


def pytest_sessionfinish(session, exitstatus):
    required = {row["id"] for row in manifest()["scenarios"]}
    passed = {r.nodeid.rsplit("[", 1)[-1].rstrip("]") for r in OUTCOMES if r.when == "call" and r.passed}
    if exitstatus or passed != required or set(CASES) != required or any(r.failed or r.skipped for r in OUTCOMES):
        session.exitstatus = exitstatus or 1
        return
    bundle = {"format": 1, "verified": True, "provider_sha": os.environ.get("CONTRACT_PROVIDER_SHA", ""),
              "previous_mobile_commit": BASELINE, "manifest_sha256": digest((ROOT / "scenarios.json").read_bytes()),
              "cases": CASES}
    validate_bundle(bundle, bundle["provider_sha"])
    path = Path(os.environ["CONTRACT_BUNDLE"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical(bundle))


@pytest.fixture
def recorder():
    return CASES
