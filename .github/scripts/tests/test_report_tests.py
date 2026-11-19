import json
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import report_tests
from collections import Counter


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.stdout = patch("sys.stdout", new_callable=io.StringIO).start()
        self.addCleanup(patch.stopall)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, name, value):
        path = self.root / name
        path.write_text(value, encoding="utf-8")
        return path

    def test_nested_junit_counts_cases_once_and_preserves_skip_reasons(self):
        report = self.write("tests.xml", '''<testsuites><testsuite tests="4"><testsuite>
            <testcase name="ok"/><testcase name="assertion"><failure>bad</failure></testcase>
            <testcase name="setup"><error>bad setup</error></testcase>
            <testcase classname="locks" name="race"><skipped message="PostgreSQL required"/></testcase>
            </testsuite></testsuite></testsuites>''')
        counts, skips = report_tests.junit_results(report)
        self.assertEqual(counts, {"passed": 1, "failed": 1, "errors": 1, "skipped": 1})
        self.assertEqual(skips, [("locks", "race", "PostgreSQL required")])

    def test_node_junit_text_skip_reason_and_missing_reason(self):
        report = self.write("node.xml", '''<testsuites><testsuite>
            <testcase name="one"><skipped>Disabled on this platform</skipped></testcase>
            <testcase name="two"><skipped/></testcase></testsuite></testsuites>''')
        counts, skips = report_tests.junit_results(report)
        self.assertEqual(counts["skipped"], 2)
        self.assertEqual([row[2] for row in skips], ["Disabled on this platform", "No skip reason recorded"])

    def test_jest_skip_and_todo_are_distinct_and_suite_errors_are_not_hidden(self):
        report = self.write("jest.json", json.dumps({
            "numTotalTests": 3, "numPassedTests": 1, "numFailedTests": 0,
            "numPendingTests": 1, "numTodoTests": 1, "numFailedTestSuites": 1,
            "testResults": [{"name": "/app/a.test.ts", "assertionResults": [
                {"status": "pending", "fullName": "skipped case"},
                {"status": "todo", "fullName": "future case"}]}],
        }))
        counts, skips = report_tests.jest_results(report)
        self.assertEqual(counts["errors"], 1)
        self.assertEqual(counts["skipped"], 1)
        self.assertEqual(counts["todo"], 1)
        self.assertEqual(len(skips), 2)

    def test_python_line_coverage_is_not_the_combined_percentage(self):
        report = self.write("coverage.json", json.dumps({"totals": {
            "covered_lines": 8, "num_statements": 10,
            "covered_branches": 1, "num_branches": 4, "percent_covered": 64.29,
        }}))
        metrics = report_tests.coverage_counts(report, "python")
        rendered = report_tests.render_report("Backend", {"passed": 2}, [], metrics)
        self.assertIn("80.00%", rendered)
        self.assertIn("25.00%", rendered)
        self.assertNotIn("64.29", rendered)

    def test_jest_coverage_uses_all_source_totals_and_no_branches_is_na(self):
        report = self.write("coverage.json", json.dumps({"total": {
            "lines": {"covered": 3, "total": 10}, "branches": {"covered": 0, "total": 0},
        }}))
        metrics = report_tests.coverage_counts(report, "jest")
        rendered = report_tests.render_report("Mobile", {"passed": 1}, [], metrics)
        self.assertIn("30.00%", rendered)
        self.assertIn("N/A", rendered)

    def test_summary_escapes_messages_and_groups_skips(self):
        summary = report_tests.render_report("<script>", {}, [
            ("module", "case", "requires | service\nwith `name`"),
            ("module", "other", "requires | service\nwith `name`"),
        ])
        self.assertIn("| 2 | requires &#124; service with &#96;name&#96; |", summary)
        self.assertIn("&lt;script&gt;", summary)
        self.assertNotIn("## <script>", summary)

    def test_main_writes_artifact_and_github_summary(self):
        junit = self.write("ok.xml", '<testsuite><testcase name="ok"/></testsuite>')
        github = self.root / "github.md"
        output = self.root / "reports" / "summary.md"
        with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(github)}):
            status = report_tests.main(["--title", "Tests", "--junit", str(junit), "--output", str(output)])
        self.assertEqual(status, 0)
        self.assertIn("No skipped tests", output.read_text())
        self.assertIn(output.read_text(), github.read_text())

    def test_main_rejects_missing_malformed_or_empty_reports(self):
        malformed = self.write("bad.xml", '<testsuite>')
        empty = self.write("empty.xml", '<testsuite tests="0"/>')
        for path in (self.root / "absent.xml", malformed, empty):
            with self.subTest(path=path), patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": ""}):
                output = self.root / "summary.md"
                status = report_tests.main(["--title", "Tests", "--junit", str(path), "--output", str(output)])
                self.assertEqual(status, 1)
                self.assertIn("missing reports are not a passing test run", output.read_text())

    def test_main_keeps_failed_tests_failing(self):
        junit = self.write("failure.xml", '<testsuite><testcase name="bad"><failure/></testcase></testsuite>')
        with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": ""}):
            status = report_tests.main(["--title", "Tests", "--junit", str(junit), "--output", str(self.root / "summary.md")])
        self.assertEqual(status, 1)

    def policy(self, allowed=None, required=None):
        return self.write("policy.json", json.dumps({
            "format": 1, "allowed_skips": allowed or [], "required_passed": required or [],
        }))

    def test_policy_requires_the_exact_skip_identity_and_reason(self):
        policy = self.policy(allowed=[{
            "test": "firmware::optional", "reason": "Arduino toolchain not installed",
            "justification": "Pending dedicated firmware-build lane",
        }])
        counts = Counter(skipped=1)
        expected = [("firmware", "optional", "Arduino toolchain not installed")]
        self.assertEqual(report_tests.policy_violations(policy, counts, expected, {})[0], [])
        for skip in [("firmware", "different", expected[0][2]), ("firmware", "optional", "Unexpected failure")]:
            with self.subTest(skip=skip):
                self.assertIn("Unexpected skipped", report_tests.policy_violations(policy, counts, [skip], {})[0][0])

    def test_missing_skipped_failed_or_error_required_cases_cannot_pass_policy(self):
        policy = self.policy(required=["locks::race"])
        for outcome in [None, "skipped", "failed", "error"]:
            with self.subTest(outcome=outcome):
                outcomes = {} if outcome is None else {"locks::race": outcome}
                violations, required_count = report_tests.policy_violations(policy, Counter(), [], outcomes)
                self.assertEqual(required_count, 1)
                self.assertIn("Required test did not pass", violations[0])
        self.assertEqual(report_tests.policy_violations(policy, Counter(passed=1), [], {"locks::race": "passed"})[0], [])

    def test_policy_cannot_allow_a_required_case_to_skip(self):
        policy = self.policy(required=["locks::race"], allowed=[{
            "test": "locks::race", "reason": "PostgreSQL required", "justification": "Not acceptable in CI",
        }])
        with self.assertRaisesRegex(ValueError, "required test cannot also"):
            report_tests.policy_violations(policy, Counter(), [], {})

    def test_policy_rejects_todo_cases_and_incomplete_skip_records(self):
        policy = self.policy()
        violations, _ = report_tests.policy_violations(policy, Counter(todo=1), [("a.test.ts", "unfinished", "TODO")], {})
        self.assertIn("Unexpected skipped/TODO", violations[0])
        violations, _ = report_tests.policy_violations(policy, Counter(skipped=2), [], {})
        self.assertIn("do not match", violations[0])

    def test_skip_exceptions_need_a_justification_and_unique_identity(self):
        entry = {"test": "case::one", "reason": "known", "justification": "Tracked follow-up"}
        for entries in [[{**entry, "justification": ""}], [entry, entry]]:
            with self.subTest(entries=entries):
                with self.assertRaises(ValueError):
                    report_tests.policy_violations(self.policy(allowed=entries), Counter(), [], {})

    def test_main_preserves_counts_and_writes_the_policy_failure_to_the_summary(self):
        junit = self.write("skip.xml", '<testsuite><testcase classname="locks" name="race"><skipped message="PostgreSQL required"/></testcase></testsuite>')
        output = self.root / "summary.md"
        with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": ""}):
            status = report_tests.main(["--title", "CI", "--junit", str(junit),
                                       "--policy", str(self.policy(required=["locks::race"])), "--output", str(output)])
        self.assertEqual(status, 1)
        summary = output.read_text(encoding="utf-8")
        self.assertIn("| 0 | 0 | 0 | 1 | 0 |", summary)
        self.assertIn("Policy failed", summary)
        self.assertIn("Required test did not pass", summary)

    def test_duplicate_junit_identities_cannot_satisfy_required_cases_ambiguously(self):
        junit = self.write("duplicate.xml", '<testsuite><testcase name="same"/><testcase name="same"/></testsuite>')
        with self.assertRaisesRegex(ValueError, "Duplicate JUnit"):
            report_tests.junit_results(junit, {})


if __name__ == "__main__":
    unittest.main()
