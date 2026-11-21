import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / "ci_gate.py"
spec = importlib.util.spec_from_file_location("ci_gate", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def suite_evidence(lane):
    execution = gate.LANES[lane]
    inner = {name: {"result": "success", "outputs": {}} for name in gate.SUITES[execution][1]}
    return {gate.POLICY: {"result": "success", "outputs": {}}, execution: {
        "result": "success", "outputs": {"job_results": json.dumps(inner)}}}


class RequiredGateTests(unittest.TestCase):
    def test_every_lane_verifies_real_workflow_jobs(self):
        for lane in gate.LANES:
            with self.subTest(lane=lane):
                result = gate.evaluate(lane, suite_evidence(lane))
                self.assertEqual(result["gate"], "ci/" + lane)
                self.assertEqual(result["result"], "success")

    def test_non_success_dependency_states_fail_every_lane(self):
        for lane in gate.LANES:
            for state in ("failure", "cancelled", "skipped", "timed_out", "neutral", "unknown", "", None, True):
                with self.subTest(lane=lane, state=state):
                    evidence = suite_evidence(lane)
                    evidence[gate.LANES[lane]]["result"] = state
                    with self.assertRaises(gate.GateError):
                        gate.evaluate(lane, evidence)

    def test_missing_dependency_policy_or_output_cannot_pass(self):
        for lane in gate.LANES:
            original = suite_evidence(lane)
            variants = [{}, {gate.POLICY: original[gate.POLICY]},
                        {gate.LANES[lane]: original[gate.LANES[lane]]}]
            for outputs in ({}, {"job_results": ""}, {"job_results": "{}"}, {"job_results": "[]"}):
                changed = copy.deepcopy(original)
                changed[gate.LANES[lane]]["outputs"] = outputs
                variants.append(changed)
            for evidence in variants:
                with self.subTest(lane=lane, evidence=evidence):
                    with self.assertRaises(gate.GateError):
                        gate.evaluate(lane, evidence)

    def test_skipped_or_missing_inner_job_is_rejected_even_if_workflow_says_success(self):
        for lane in gate.LANES:
            original = suite_evidence(lane)
            execution = gate.LANES[lane]
            jobs = json.loads(original[execution]["outputs"]["job_results"])
            for name in jobs:
                for state in ("failure", "cancelled", "skipped", "timed_out", None):
                    changed = copy.deepcopy(jobs)
                    changed[name]["result"] = state
                    original[execution]["outputs"]["job_results"] = json.dumps(changed)
                    with self.subTest(lane=lane, job=name, state=state):
                        with self.assertRaises(gate.GateError):
                            gate.evaluate(lane, original)
                missing = copy.deepcopy(jobs)
                del missing[name]
                original[execution]["outputs"]["job_results"] = json.dumps(missing)
                with self.assertRaises(gate.GateError):
                    gate.evaluate(lane, original)

    def test_aggregate_requires_exactly_all_nine_gates_and_policy(self):
        evidence = {name: {"result": "success", "outputs": {}}
                    for name in (gate.POLICY, *("gate-" + n for n in gate.LANES))}
        self.assertEqual(gate.evaluate("release-readiness", evidence)["result"], "success")
        for name in evidence:
            for state in ("failure", "cancelled", "skipped", "timed_out", None):
                changed = copy.deepcopy(evidence)
                changed[name]["result"] = state
                with self.assertRaises(gate.GateError):
                    gate.evaluate("release-readiness", changed)
            changed = copy.deepcopy(evidence)
            del changed[name]
            with self.assertRaises(gate.GateError):
                gate.evaluate("release-readiness", changed)
        evidence["unexpected"] = {"result": "success"}
        with self.assertRaises(gate.GateError):
            gate.evaluate("release-readiness", evidence)

    def test_malformed_duplicate_and_unbounded_json_fail_closed(self):
        for raw in (None, "", "null", "[]", "broken", '{"a":1,"a":2}', " " * 65537):
            with self.subTest(raw_type=type(raw).__name__):
                with self.assertRaises(gate.GateError):
                    gate.load_object(raw)

    def test_cli_failure_is_nonzero_and_writes_failure_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "result.json"
            env = dict(os.environ, CI_NEEDS="{}")
            env.pop("GITHUB_STEP_SUMMARY", None)
            result = subprocess.run([sys.executable, str(SCRIPT), "--lane", "backend", "--output", str(output)],
                                    env=env, text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(output.read_text())["result"], "failure")

    def test_unknown_lane_cannot_pass(self):
        with self.assertRaises(gate.GateError):
            gate.evaluate("invented", {})


if __name__ == "__main__":
    unittest.main()
