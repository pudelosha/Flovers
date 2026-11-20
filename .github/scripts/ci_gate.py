"""Fail-closed required checks. Uses only stdlib and never calls GitHub or providers."""
import argparse
import json
import os
from pathlib import Path
import sys


SUITES = {
    "backend-execution": ("test-backend.yml", ("tests",)),
    "mobile-execution": ("test-mobile.yml", ("tests",)),
    "web-execution": ("test-web.yml", ("tests",)),
    "contracts-execution": ("test-api-contracts.yml", ("provider", "consumers", "compatibility")),
    "celery-execution": ("test-celery-integration.yml", ("real-delivery",)),
    "firmware-execution": ("test-firmware.yml", ("compile",)),
    "e2e-execution": ("test-e2e.yml", ("android-build", "android", "browser", "gate")),
    "staging-execution": ("test-staging.yml", ("release-rehearsal",)),
}
LANES = {
    "backend": "backend-execution", "mobile": "mobile-execution",
    "web": "web-execution", "contracts": "contracts-execution",
    "celery": "celery-execution", "firmware": "firmware-execution",
    "browser": "e2e-execution", "android": "e2e-execution",
    "staging": "staging-execution",
}
POLICY = "coordinator-policy"
CHECK_NAMES = tuple("ci/" + name for name in (*LANES, "release-readiness"))


class GateError(ValueError):
    pass


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise GateError("Duplicate JSON key")
        result[key] = value
    return result


def load_object(raw):
    if not isinstance(raw, str) or not raw or len(raw) > 65536:
        raise GateError("Missing or oversized dependency evidence")
    try:
        result = json.loads(raw, object_pairs_hook=_unique_object)
    except (ValueError, TypeError, RecursionError) as exc:
        raise GateError("Invalid dependency JSON") from exc
    if not isinstance(result, dict):
        raise GateError("Dependency evidence must be an object")
    return result


def _require_jobs(actual, expected, scope):
    if not isinstance(actual, dict) or set(actual) != set(expected):
        raise GateError(f"{scope}: missing or unexpected mandatory jobs")
    for name in expected:
        job = actual[name]
        if not isinstance(job, dict) or job.get("result") != "success":
            raise GateError(f"{scope}: mandatory job {name} did not succeed")


def evaluate(lane, needs):
    if lane == "release-readiness":
        expected = (POLICY, *("gate-" + name for name in LANES))
        _require_jobs(needs, expected, "release-readiness")
        return {"gate": "ci/release-readiness", "result": "success", "verified_jobs": list(expected)}
    if lane not in LANES:
        raise GateError("Unknown required lane")
    execution = LANES[lane]
    _require_jobs(needs, (POLICY, execution), lane)
    outputs = needs[execution].get("outputs")
    if not isinstance(outputs, dict):
        raise GateError(f"{lane}: missing reusable-workflow outputs")
    jobs = load_object(outputs.get("job_results"))
    _require_jobs(jobs, SUITES[execution][1], lane + " suite")
    return {"gate": "ci/" + lane, "result": "success", "verified_jobs": list(jobs)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lane", required=True, choices=(*LANES, "release-readiness"))
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        result = evaluate(args.lane, load_object(os.environ.get("CI_NEEDS")))
        exit_code = 0
    except GateError as exc:
        result = {"gate": "ci/" + args.lane, "result": "failure", "reason": str(exc)}
        exit_code = 1
    rendered = json.dumps(result, indent=2)
    print(rendered)
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered + "\n", encoding="utf-8")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
            summary.write(f"### {result['gate']}: {result['result']}\n\n```json\n{rendered}\n```\n")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
