"""Validate the unfiltered PR coordinator and its fail-closed reusable graph."""
from pathlib import Path
import sys

import yaml

from ci_gate import CHECK_NAMES, LANES, POLICY, SUITES

ROOT = Path(__file__).resolve().parents[2]


class PolicyError(ValueError):
    pass


class UniqueLoader(yaml.BaseLoader):
    pass


def _mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in result:
            raise PolicyError("Duplicate workflow key")
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor("tag:yaml.org,2002:map", _mapping)


def load(path):
    with path.open(encoding="utf-8") as source:
        return yaml.load(source, Loader=UniqueLoader)


def _require(condition, reason):
    if not condition:
        raise PolicyError(reason)


def _needs(job):
    value = job.get("needs", [])
    return [value] if isinstance(value, str) else value


def _no_soft_fail(node):
    if isinstance(node, dict):
        _require("continue-on-error" not in node, "Mandatory work cannot continue on error")
        for value in node.values():
            _no_soft_fail(value)
    elif isinstance(node, list):
        for value in node:
            _no_soft_fail(value)


def validate(coordinator, suites):
    triggers = coordinator.get("on", {})
    _require(set(triggers) == {"pull_request", "push", "workflow_dispatch"}, "PR and exact-main release verification triggers are required")
    _require(triggers["push"] == {"branches": ["main"]}, "Main verification must have no path filters")
    _require(triggers["workflow_dispatch"] in (None, "", {}), "Manual CI cannot accept skip inputs")
    event = triggers["pull_request"]
    _require(isinstance(event, dict) and set(event) == {"types"}, "PR path/branch filters or skip controls are forbidden")
    _require(set(event["types"]) == {"opened", "synchronize", "reopened", "edited", "ready_for_review"}, "Missing PR lifecycle event")
    _require(coordinator.get("permissions") == {"contents": "read"}, "Coordinator must have read-only permissions")
    _no_soft_fail(coordinator)
    jobs = coordinator.get("jobs", {})
    expected = {POLICY, "release-readiness", *SUITES, *("gate-" + lane for lane in LANES)}
    _require(set(jobs) == expected, "Missing or unexpected coordinator jobs")
    names = [job.get("name", key) for key, job in jobs.items()]
    _require(len(names) == len(set(names)), "Ambiguous check names")
    _require({n for n in names if n.startswith("ci/")} == set(CHECK_NAMES), "Required check names changed")
    policy = jobs[POLICY]
    _require(not policy.get("if") and "needs" not in policy, "Policy must always run first")
    policy_commands = "\n".join(step.get("run", "") for step in policy.get("steps", []))
    _require("ci_workflow_policy.py" in policy_commands and "scripts/tests" in policy_commands and "coordinator_tests" in policy_commands,
             "Policy and gate regression tests must execute")
    for directory in (".github/scripts/tests", ".github/scripts/coordinator_tests"):
        _require("python .github/scripts/run_ci_unit_tests.py " + directory in policy_commands,
                 "Policy unit tests must reject skips and zero-test runs")
    for execution, (filename, inner) in SUITES.items():
        job = jobs[execution]
        _require(job.get("uses") == "./.github/workflows/" + filename, "Wrong reusable test workflow")
        _require(_needs(job) == [POLICY] and "if" not in job, "Mandatory execution must not be conditionally skipped")
        _require("with" not in job and "secrets" not in job, "Mandatory execution cannot receive skip inputs or secrets")
        suite = suites[filename]
        _no_soft_fail(suite)
        _require("pull_request" not in suite.get("on", {}), "PR suites must run once through the coordinator")
        call = suite.get("on", {}).get("workflow_call", {})
        _require(isinstance(call, dict) and "inputs" not in call and "secrets" not in call, "Reusable suites cannot hide mandatory work behind inputs")
        _require(call.get("outputs", {}).get("job_results", {}).get("value") == "${{ toJSON(jobs) }}", "Reusable workflow must expose actual internal job results")
        _require(set(suite.get("jobs", {})) == set(inner), "Reusable suite lost a mandatory job")
        for inner_job in suite["jobs"].values():
            _require(inner_job.get("if", "always()") == "always()", "Required suite job has a skip condition")
    for lane, execution in LANES.items():
        _gate(jobs["gate-" + lane], lane, {POLICY, execution})
    _gate(jobs["release-readiness"], "release-readiness", {POLICY, *("gate-" + lane for lane in LANES)})
    return {"required_checks": list(CHECK_NAMES), "reusable_suites": len(SUITES), "unfiltered_prs": True}


def _gate(job, lane, needs):
    _require(job.get("name") == "ci/" + lane, "Unstable gate name")
    _require(job.get("if") == "always()" and set(_needs(job)) == needs, "Gate cannot skip failed or missing dependencies")
    steps = [s for s in job.get("steps", []) if "ci_gate.py" in s.get("run", "")]
    _require(len(steps) == 1, "Required evaluator is missing or duplicated")
    step = steps[0]
    _require("if" not in step and step.get("env", {}).get("CI_NEEDS") == "${{ toJSON(needs) }}", "Gate must evaluate actual dependency results")
    command = "python .github/scripts/ci_gate.py --lane " + lane
    if lane == "release-readiness":
        command += " --output ci-results/required-gates.json"
    _require(step["run"] == command, "Gate must propagate evaluator exit status unchanged")


def current(root=ROOT):
    directory = root / ".github/workflows"
    return load(directory / "ci-main.yml"), {name: load(directory / name) for name in {s[0] for s in SUITES.values()}}


if __name__ == "__main__":
    try:
        print(validate(*current()))
    except (PolicyError, KeyError, TypeError, yaml.YAMLError) as exc:
        print(f"Mandatory CI policy failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
