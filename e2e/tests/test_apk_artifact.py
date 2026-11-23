"""Artifact retries use the exact producer, run and commit; never latest-by-age."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

from e2e.android import apk_artifact as apk


class APKArtifactTests(unittest.TestCase):
    def setUp(self):
        self.env = {"GITHUB_REPOSITORY": "pudelosha/Flovers", "GITHUB_REPOSITORY_ID": "1066513165",
                    "GITHUB_RUN_ID": "12345", "GITHUB_SHA": "a" * 40, "E2E_SOURCE_SHA": "b" * 40,
                    "GITHUB_RUN_ATTEMPT": "1"}
        self.identity = apk.context(self.env)
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        (self.directory / "app-e2e.apk").write_bytes(b"synthetic-APK-no-device-or-network")
        self.artifact = {"id": 6789, "name": apk.artifact_name(self.identity), "expired": False,
                         "size_in_bytes": 123, "digest": "sha256:" + "c" * 64,
                         "workflow_run": {"id": 12345, "repository_id": 1066513165, "head_sha": "b" * 40}}

    def reader(self, artifacts):
        return Mock(return_value={"total_count": len(artifacts), "artifacts": artifacts})

    def build(self, identity=None):
        apk.create(self.directory, identity or self.identity, self.env["GITHUB_SHA"])

    def test_initial_attempt_resolves_and_verifies_exact_build(self):
        self.build()
        read = self.reader([self.artifact])
        self.assertEqual(apk.resolve(self.identity, read), 6789)
        self.assertEqual(apk.verify(self.directory, self.identity)["attempt"], 1)
        read.assert_called_once_with("/actions/runs/12345/artifacts?per_page=100&page=1")

    def test_failed_job_retry_reuses_original_verified_build(self):
        self.build()
        for attempt in (2, 3, 7):
            retry = apk.context({**self.env, "GITHUB_RUN_ATTEMPT": str(attempt)})
            with self.subTest(attempt=attempt):
                self.assertEqual(apk.artifact_name(retry), self.artifact["name"])
                self.assertEqual(apk.resolve(retry, self.reader([self.artifact])), 6789)
                self.assertEqual(apk.verify(self.directory, retry)["attempt"], 1)

    def test_full_rerun_verifies_replacement_then_later_failed_retry_reuses_it(self):
        self.build()
        rerun = apk.context({**self.env, "GITHUB_RUN_ATTEMPT": "2"})
        (self.directory / "app-e2e.apk").write_bytes(b"replacement-synthetic-APK")
        self.build(rerun)
        replacement = {**self.artifact, "id": 6790, "digest": "sha256:" + "d" * 64}
        self.assertEqual(apk.resolve(rerun, self.reader([replacement])), 6790)
        self.assertEqual(apk.verify(self.directory, rerun)["attempt"], 2)
        retry = apk.context({**self.env, "GITHUB_RUN_ATTEMPT": "3"})
        self.assertEqual(apk.verify(self.directory, retry)["attempt"], 2)

    def test_missing_artifact_never_falls_back_to_other_name_or_run(self):
        other = {**self.artifact, "name": "android-smoke-apk-99999-" + "a" * 40}
        for artifacts in ([], [other]):
            with self.subTest(artifacts=artifacts), self.assertRaisesRegex(ValueError, "Exactly one"):
                apk.resolve(self.identity, self.reader(artifacts))

    def test_ambiguous_artifacts_fail_instead_of_picking_newest(self):
        newer = {**self.artifact, "id": 6790}
        with self.assertRaisesRegex(ValueError, "Exactly one"):
            apk.resolve(self.identity, self.reader([self.artifact, newer]))

    def test_foreign_commit_run_repository_expired_or_unsigned_metadata_fail(self):
        for mutation in [lambda a: a["workflow_run"].update(head_sha="d" * 40),
                         lambda a: a["workflow_run"].update(id=99999),
                         lambda a: a["workflow_run"].update(repository_id=99),
                         lambda a: a.update(expired=True), lambda a: a.update(digest=None)]:
            artifact = copy.deepcopy(self.artifact)
            mutation(artifact)
            with self.subTest(artifact=artifact), self.assertRaises(ValueError):
                apk.resolve(self.identity, self.reader([artifact]))

    def test_wrong_checkout_sha_and_wrong_payload_commit_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "Checkout"):
            apk.create(self.directory, self.identity, "f" * 40)
        self.build()
        manifest = self.directory / "provenance.json"
        original = json.loads(manifest.read_text(encoding="utf8"))
        for key, value in [("checkout_sha", "f" * 40), ("source_sha", "f" * 40), ("run_id", 99999),
                           ("repository", "other/repository"), ("attempt", 2), ("package", "com.flovers.mobile")]:
            manifest.write_text(json.dumps({**original, key: value}), encoding="utf8")
            with self.subTest(key=key), self.assertRaises(ValueError):
                apk.verify(self.directory, self.identity)

    def test_corrupt_apk_duplicate_manifest_keys_and_extra_payloads_fail(self):
        self.build()
        (self.directory / "app-e2e.apk").write_bytes(b"modified")
        with self.assertRaisesRegex(ValueError, "checksum"):
            apk.verify(self.directory, self.identity)
        self.build()
        manifest = self.directory / "provenance.json"
        manifest.write_text('{"format":1,"format":1}', encoding="utf8")
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            apk.verify(self.directory, self.identity)
        self.build()
        (self.directory / "other.apk").write_bytes(b"unexpected")
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            apk.verify(self.directory, self.identity)

    def test_pagination_checks_all_current_run_artifacts_before_selection(self):
        unrelated = [{"id": n, "name": "diagnostic-" + str(n)} for n in range(1, 101)]
        read = Mock(side_effect=[{"total_count": 101, "artifacts": unrelated},
                                 {"total_count": 101, "artifacts": [self.artifact]}])
        self.assertEqual(apk.resolve(self.identity, read), 6789)
        self.assertEqual(read.call_args_list[1].args[0], "/actions/runs/12345/artifacts?per_page=100&page=2")
        read = Mock(side_effect=[{"total_count": 101, "artifacts": unrelated}, {"total_count": 101, "artifacts": []}])
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            apk.resolve(self.identity, read)

    def test_missing_or_invalid_github_context_cannot_select_an_artifact(self):
        for key in self.env:
            env = dict(self.env)
            del env[key]
            with self.subTest(key=key), self.assertRaises(ValueError):
                apk.context(env)


if __name__ == "__main__":
    unittest.main()
