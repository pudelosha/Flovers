"""Run policy unit tests without accepting skips, missing tests or expected failures."""
import argparse
import sys
import unittest


def accepted(result):
    return (result.testsRun > 0 and result.wasSuccessful() and not result.skipped
            and not result.expectedFailures and not result.unexpectedSuccesses)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory")
    args = parser.parse_args(argv)
    suite = unittest.defaultTestLoader.discover(args.directory, pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not accepted(result):
        print("CI policy tests require passing nonempty execution with zero skips/expected failures", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
