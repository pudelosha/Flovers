import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).parents[1]))
import ci_workflow_policy as policy


class WorkflowContractTests(unittest.TestCase):
    def setUp(self):
        self.coordinator, self.suites = policy.current()

    def test_complete_real_graph_and_ten_names(self):
        result = policy.validate(self.coordinator, self.suites)
        self.assertEqual(len(result["required_checks"]), 10)
        self.assertTrue(result["unfiltered_prs"])

    def test_docs_only_and_all_other_paths_have_no_exclusion(self):
        for key in ("paths", "paths-ignore", "branches", "branches-ignore"):
            changed = copy.deepcopy(self.coordinator)
            changed["on"]["pull_request"][key] = ["backend/**"]
            with self.subTest(key=key), self.assertRaises(policy.PolicyError):
                policy.validate(changed, self.suites)

    def test_exact_main_verification_has_no_path_filter_and_manual_has_no_skip_inputs(self):
        for trigger in ({"branches":["main"],"paths":["backend/**"]}, {"branches":["*"]}):
            changed=copy.deepcopy(self.coordinator);changed["on"]["push"]=trigger
            with self.assertRaises(policy.PolicyError):policy.validate(changed,self.suites)
        changed=copy.deepcopy(self.coordinator)
        changed["on"]["workflow_dispatch"]={"inputs":{"skip_android":{"default":"true"}}}
        with self.assertRaises(policy.PolicyError):policy.validate(changed,self.suites)

    def test_missing_lane_and_dependency_are_rejected(self):
        for job in ("mobile-execution", "gate-android", "release-readiness"):
            changed = copy.deepcopy(self.coordinator)
            del changed["jobs"][job]
            with self.assertRaises(policy.PolicyError):
                policy.validate(changed, self.suites)
        changed = copy.deepcopy(self.coordinator)
        changed["jobs"]["gate-mobile"]["needs"] = ["coordinator-policy"]
        with self.assertRaises(policy.PolicyError):
            policy.validate(changed, self.suites)

    def test_conditionally_skipping_gates_or_execution_is_rejected(self):
        for job in ("gate-mobile", "release-readiness", "mobile-execution"):
            changed = copy.deepcopy(self.coordinator)
            changed["jobs"][job]["if"] = "success()"
            with self.assertRaises(policy.PolicyError):
                policy.validate(changed, self.suites)

    def test_continue_on_error_or_swallowed_exit_status_is_rejected(self):
        changed = copy.deepcopy(self.coordinator)
        changed["jobs"]["gate-mobile"]["continue-on-error"] = "true"
        with self.assertRaises(policy.PolicyError):
            policy.validate(changed, self.suites)
        changed = copy.deepcopy(self.coordinator)
        changed["jobs"]["gate-mobile"]["steps"][-1]["run"] += " || true"
        with self.assertRaises(policy.PolicyError):
            policy.validate(changed, self.suites)

    def test_duplicate_names_and_wrong_outputs_are_rejected(self):
        changed = copy.deepcopy(self.coordinator)
        changed["jobs"]["gate-mobile"]["name"] = "ci/backend"
        with self.assertRaises(policy.PolicyError):
            policy.validate(changed, self.suites)
        changed = copy.deepcopy(self.suites)
        changed["test-mobile.yml"]["on"]["workflow_call"]["outputs"]["job_results"]["value"] = "success"
        with self.assertRaises(policy.PolicyError):
            policy.validate(self.coordinator, changed)

    def test_missing_inner_job_or_secret_input_is_rejected(self):
        changed = copy.deepcopy(self.suites)
        del changed["test-e2e.yml"]["jobs"]["android"]
        with self.assertRaises(policy.PolicyError):
            policy.validate(self.coordinator, changed)
        changed = copy.deepcopy(self.coordinator)
        changed["jobs"]["mobile-execution"]["secrets"] = "inherit"
        with self.assertRaises(policy.PolicyError):
            policy.validate(changed, self.suites)

    def test_duplicate_yaml_keys_are_not_silently_overwritten(self):
        with self.assertRaises(policy.PolicyError):
            policy.yaml.load("jobs: {}\njobs: {}\n", Loader=policy.UniqueLoader)


if __name__ == "__main__":
    unittest.main()
