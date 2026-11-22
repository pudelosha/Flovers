"""No GitHub requests: exact-main provenance, protection and mode failure injection."""
import copy
import sys
from pathlib import Path
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/".github/scripts"))
import production_gate as gate

SHA="a"*40


class CIApprovalTests(unittest.TestCase):
    def setUp(self):
        names=list(gate.CHECK_NAMES)
        self.responses={
            "/branches/main":{"protected":True,"commit":{"sha":SHA}},
            "/rules/branches/main":[{"type":name} for name in ["pull_request","non_fast_forward","deletion"]]+[
                {"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":True,
                 "required_status_checks":[{"context":name,"integration_id":15368} for name in names]}}],
            f"/commits/{SHA}/check-runs?per_page=100&filter=latest":{"total_count":10,"check_runs":[
                {"name":name,"app":{"id":15368},"head_sha":SHA,"status":"completed","conclusion":"success",
                 "details_url":f"https://github.com/pudelosha/Flovers/actions/runs/321/job/{n}"} for n,name in enumerate(names)]},
            "/actions/runs/321":{"id":321,"head_sha":SHA,"head_branch":"main","event":"push",
                "path":".github/workflows/ci-main.yml","status":"completed","conclusion":"success"},
            f"/actions/workflows/ci-main.yml/runs?branch=main&head_sha={SHA}&per_page=100":{"workflow_runs":[
                {"id":321,"head_sha":SHA,"head_branch":"main","event":"push","run_number":4,"run_attempt":1}]},
            "/actions/runs/321/jobs?per_page=100":{"total_count":24,"jobs":[
                {"name":name,"status":"completed","conclusion":"success"} for name in names+[f"execution-{n}" for n in range(14)]]},
        }

    def read(self,path):return self.responses[path]

    def test_exact_main_and_complete_ten_action_checks_allow_readiness(self):
        self.assertEqual(gate.require_main_ci(SHA,self.read),"321")

    def test_missing_failed_cancelled_skipped_pending_or_foreign_checks_block(self):
        key=f"/commits/{SHA}/check-runs?per_page=100&filter=latest"
        original=copy.deepcopy(self.responses[key])
        for name in gate.CHECK_NAMES:
            for conclusion in ("failure","cancelled","timed_out","skipped",None):
                self.responses[key]=copy.deepcopy(original)
                row=next(c for c in self.responses[key]["check_runs"] if c["name"]==name)
                row.update(conclusion=conclusion,status="in_progress" if conclusion is None else "completed")
                with self.subTest(check=name,conclusion=conclusion),self.assertRaises(gate.ApprovalError):
                    gate.require_main_ci(SHA,self.read)
        for mutation in (lambda r:r["check_runs"].pop(),
                         lambda r:r["check_runs"][0]["app"].update(id=999),
                         lambda r:r["check_runs"][0].update(head_sha="b"*40),
                         lambda r:r["check_runs"][0].update(details_url="https://github.com/other/repo/actions/runs/321/job/1")):
            self.responses[key]=copy.deepcopy(original);mutation(self.responses[key])
            with self.assertRaises(gate.ApprovalError):gate.require_main_ci(SHA,self.read)

    def test_arbitrary_sha_unprotected_main_and_weakened_rules_cannot_release(self):
        original=copy.deepcopy(self.responses)
        mutations=[lambda r:r["/branches/main"]["commit"].update(sha="b"*40),
                   lambda r:r["/branches/main"].update(protected=False),
                   lambda r:r["/rules/branches/main"].pop(0),
                   lambda r:r["/rules/branches/main"][-1]["parameters"].update(strict_required_status_checks_policy=False),
                   lambda r:r["/rules/branches/main"][-1]["parameters"]["required_status_checks"][0].update(integration_id=999)]
        for mutation in mutations:
            self.responses=copy.deepcopy(original);mutation(self.responses)
            with self.assertRaises(gate.ApprovalError):gate.require_main_ci(SHA,self.read)

    def test_mixed_run_or_failed_inner_job_or_newer_incomplete_run_cannot_pass(self):
        original=copy.deepcopy(self.responses)
        mutations=[lambda r:r[f"/commits/{SHA}/check-runs?per_page=100&filter=latest"]["check_runs"][0].update(details_url="https://github.com/pudelosha/Flovers/actions/runs/322/job/1"),
                   lambda r:r["/actions/runs/321"].update(event="pull_request"),
                   lambda r:r["/actions/runs/321"].update(path=".github/workflows/other.yml"),
                   lambda r:r["/actions/runs/321/jobs?per_page=100"]["jobs"][-1].update(conclusion="skipped"),
                   lambda r:r[f"/actions/workflows/ci-main.yml/runs?branch=main&head_sha={SHA}&per_page=100"]["workflow_runs"].append(
                       {"id":322,"head_sha":SHA,"head_branch":"main","event":"workflow_dispatch","run_number":5,"run_attempt":1})]
        for mutation in mutations:
            self.responses=copy.deepcopy(original);mutation(self.responses)
            with self.assertRaises(gate.ApprovalError):gate.require_main_ci(SHA,self.read)

    def test_modes_require_their_own_explicit_confirmation(self):
        event={"repository":{"full_name":"pudelosha/Flovers","owner":{"login":"pudelosha","id":123}},"inputs":{}}
        env={"GITHUB_EVENT_NAME":"workflow_dispatch","GITHUB_REPOSITORY":"pudelosha/Flovers","GITHUB_REF":"refs/heads/main",
             "GITHUB_SHA":SHA,"GITHUB_ACTOR":"pudelosha","GITHUB_TRIGGERING_ACTOR":"pudelosha","GITHUB_ACTOR_ID":"123"}
        for mode in ("LIGHT","FULL"):
            event["inputs"]={"revision":SHA,"deployment_mode":mode,"confirmation":f"DEPLOY BACKEND {mode} {SHA}"}
            self.assertEqual(gate.authorize(event,env,"backend")["mode"],mode)
            event["inputs"]["confirmation"]="DEPLOY BACKEND "+SHA
            with self.assertRaises(gate.ApprovalError):gate.authorize(event,env,"backend")
        for mode in (None,"", "light","FULL ","OTHER"):
            event["inputs"]={"revision":SHA,"deployment_mode":mode,"confirmation":f"DEPLOY BACKEND {mode} {SHA}"}
            with self.assertRaises(gate.ApprovalError):gate.authorize(event,env,"backend")


if __name__=="__main__":unittest.main()
