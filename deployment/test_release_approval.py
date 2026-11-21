"""Production gates are tested with synthetic events and no GitHub connections."""
import copy
import base64
import json
import os
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
from unittest.mock import patch, Mock

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/".github/scripts"))
import production_gate
import web_release
import package_release

SHA="a"*40
OWNER=12345


class ApprovalTests(unittest.TestCase):
    def setUp(self):
        self.event={"repository":{"full_name":"pudelosha/Flovers","owner":{"login":"pudelosha","id":OWNER}},
                    "inputs":{"revision":SHA,"confirmation":"DEPLOY BACKEND "+SHA}}
        self.env={"GITHUB_EVENT_NAME":"workflow_dispatch","GITHUB_REPOSITORY":"pudelosha/Flovers",
                  "GITHUB_REF":"refs/heads/main","GITHUB_SHA":SHA,"GITHUB_ACTOR":"pudelosha",
                  "GITHUB_TRIGGERING_ACTOR":"pudelosha","GITHUB_ACTOR_ID":str(OWNER)}
        self.configuration={"can_admins_bypass":False,"deployment_branch_policy":{"protected_branches":False,"custom_branch_policies":True},
                            "protection_rules":[{"type":"required_reviewers","prevent_self_review":False,
                                                  "reviewers":[{"type":"User","reviewer":{"id":OWNER}}]}]}
        self.policies={"total_count":1,"branch_policies":[{"name":"main","type":"branch"}]}

    def test_only_owner_main_dispatch_with_exact_revision_and_confirmation_is_allowed(self):
        self.assertEqual(production_gate.authorize(self.event,self.env,"backend")["revision"],SHA)
        for key,bad in [("GITHUB_EVENT_NAME","push"),("GITHUB_EVENT_NAME","pull_request"),
                        ("GITHUB_REF","refs/heads/review"),("GITHUB_REF","refs/tags/main"),
                        ("GITHUB_ACTOR","collaborator"),("GITHUB_TRIGGERING_ACTOR","collaborator"),
                        ("GITHUB_ACTOR_ID","999"),("GITHUB_REPOSITORY","fork/Flovers"),("GITHUB_SHA","main")]:
            with self.subTest(key=key,bad=bad),self.assertRaises(production_gate.ApprovalError):
                production_gate.authorize(self.event,{**self.env,key:bad},"backend")
        for inputs in ({},{"revision":SHA},{"revision":"b"*40,"confirmation":"DEPLOY BACKEND "+SHA},
                       {"revision":SHA,"confirmation":"yes"}):
            with self.subTest(inputs=inputs),self.assertRaises(production_gate.ApprovalError):
                production_gate.authorize({**self.event,"inputs":inputs},self.env,"backend")

    def test_website_has_distinct_explicit_approval(self):
        with self.assertRaises(production_gate.ApprovalError): production_gate.authorize(self.event,self.env,"website")
        self.event["inputs"]["confirmation"]="PUBLISH WEBSITE "+SHA
        self.assertEqual(production_gate.authorize(self.event,self.env,"website")["environment"],"github-pages")

    def test_missing_reviewers_bypass_or_branch_wildcards_block_release(self):
        production_gate.require_environment(self.configuration,self.policies,OWNER)
        mutations=[lambda c:c.update(can_admins_bypass=True),lambda c:c.update(protection_rules=[]),
                   lambda c:c["protection_rules"][0].update(prevent_self_review=True),
                   lambda c:c["protection_rules"][0]["reviewers"][0]["reviewer"].update(id=999),
                   lambda c:c["protection_rules"][0]["reviewers"].append({"type":"User","reviewer":{"id":999}}),
                   lambda c:c.update(deployment_branch_policy=None)]
        for mutation in mutations:
            c=copy.deepcopy(self.configuration);mutation(c)
            with self.subTest(configuration=c),self.assertRaises(production_gate.ApprovalError):
                production_gate.require_environment(c,self.policies,OWNER)
        for policies in ({},{"total_count":1,"branch_policies":[{"name":"*","type":"branch"}]},
                         {"total_count":2,"branch_policies":[{"name":"main","type":"branch"},{"name":"main","type":"tag"}]}):
            with self.assertRaises(production_gate.ApprovalError): production_gate.require_environment(self.configuration,policies,OWNER)

    def test_unavailable_environment_inspection_cannot_be_successful(self):
        with patch("production_gate.urlopen",side_effect=TimeoutError),self.assertRaises(production_gate.ApprovalError):
            production_gate.github("/environments/production-backend","synthetic-token")


class WebsiteArtifactTests(unittest.TestCase):
    def test_publication_receipt_must_match_approved_revision(self):
        response=Mock();response.status=200
        response.__enter__=Mock(return_value=response);response.__exit__=Mock(return_value=False)
        opener=Mock();opener.open.return_value=response
        response.read.return_value=json.dumps({"revision":SHA,"files":{"index.html":"synthetic"}}).encode()
        with patch("web_release.build_opener",return_value=opener):
            self.assertEqual(web_release.verify_publication("https://site.example.test/Flovers",SHA)["revision"],SHA)
        response.read.return_value=json.dumps({"revision":"b"*40,"files":{"index.html":"synthetic"}}).encode()
        with patch("web_release.build_opener",return_value=opener),self.assertRaises(ValueError):
            web_release.verify_publication("https://site.example.test/Flovers",SHA)

    def test_missing_entry_asset_blocks_publication_and_valid_output_records_revision(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/"assets").mkdir()
            (root/"index.html").write_text('<script src="/Flovers/assets/index.js"></script>')
            with self.assertRaises(ValueError): web_release.record(root,SHA,"123")
            (root/"assets/index.js").write_text("console.log('synthetic fixture');")
            result=web_release.record(root,SHA,"123")
            self.assertEqual(result["revision"],SHA)
            self.assertEqual(set(result["files"]),{"index.html","assets/index.js"})
            self.assertTrue((root/"release.json").is_file())

    def test_invalid_revision_and_external_entry_scripts_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/"assets").mkdir()
            (root/"index.html").write_text('<script src="https://example.test/main.js"></script>')
            with self.assertRaises(ValueError): web_release.record(root,SHA,"123")
            with self.assertRaises(ValueError): web_release.record(root,"main","123")


class BundleTests(unittest.TestCase):
    def test_bundle_loads_all_modules_but_cannot_deploy_without_approved_identity(self):
        program=base64.b64decode(package_release.payload(),validate=True).decode()
        self.assertLess(len(program.encode()),90000)
        result=subprocess.run([sys.executable,"-c",program],env={"PATH":os.defpath},capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,1)
        self.assertIn("Backend deployment failed (ValueError)",result.stderr)


if __name__=="__main__": unittest.main()
