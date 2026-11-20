import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("strict_runner", Path(__file__).parents[1] / "run_ci_unit_tests.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class StrictUnitPolicyTests(unittest.TestCase):
    def result(self):
        result = unittest.TestResult()
        result.testsRun = 1
        return result

    def test_only_nonempty_passing_run_is_accepted(self):
        self.assertTrue(runner.accepted(self.result()))
        self.assertFalse(runner.accepted(unittest.TestResult()))

    def test_skips_expected_failures_and_failures_are_not_success(self):
        for attr in ("skipped", "expectedFailures", "unexpectedSuccesses", "failures", "errors"):
            result = self.result()
            getattr(result, attr).append(("synthetic", "intentional fixture"))
            with self.subTest(attr=attr):
                self.assertFalse(runner.accepted(result))


if __name__ == "__main__":
    unittest.main()
