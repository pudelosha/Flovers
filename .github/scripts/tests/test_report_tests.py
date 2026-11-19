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


if __name__ == "__main__":
    unittest.main()
