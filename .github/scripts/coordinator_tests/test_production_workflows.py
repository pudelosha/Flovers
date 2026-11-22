import copy
from pathlib import Path
import unittest
from ci_workflow_policy import load,PolicyError
from production_workflow_policy import validate

ROOT=Path(__file__).resolve().parents[3]


class ProductionWorkflowTests(unittest.TestCase):
    def sources(self):
        for target,file in [("backend","deploy-backend.yml"),("website","deploy-web.yml")]:
            yield target,load(ROOT/".github/workflows"/file)

    def test_real_workflows_are_manual_and_gate_every_side_effect(self):
        for target,source in self.sources():self.assertTrue(validate(source,target))
        policy=load(ROOT/".github/workflows/ci-main.yml")
        self.assertIn("python .github/scripts/run_ci_unit_tests.py deployment",[s.get("run") for s in policy["jobs"]["coordinator-policy"]["steps"]])

    def test_push_trigger_review_bypass_and_early_privileges_are_rejected(self):
        for target,original in self.sources():
            mutations=[lambda w:w["on"].update(push={}),lambda w:w["jobs"]["release"].update(environment={}),
                       lambda w:w["jobs"]["release"].update(needs=["quality"]),
                       lambda w:w["jobs"]["release"].update(**{"if":"always()"}),
                       lambda w:w["jobs"]["authorize"].update(permissions={"contents":"write"}),
                       lambda w:w["concurrency"].update(**{"cancel-in-progress":"true"})]
            for mutate in mutations:
                value=copy.deepcopy(original);mutate(value)
                with self.subTest(target=target,mutation=mutate),self.assertRaises(PolicyError):validate(value,target)


if __name__=="__main__":unittest.main()
