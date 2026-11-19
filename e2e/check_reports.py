"""Required journeys must exist and pass; empty, skipped or substituted suites fail."""
import argparse
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

BROWSER = {
    "homepage renders real assets",
    "main navigation reaches documentation schemas and FAQ",
    "language selector preserves route and translates navigation",
    "public footer pages and store availability",
    "responsive layout keeps navigation and content inside viewport",
}
ANDROID = {"navigation-smoke", "completion-smoke"}


def validate(kind, path):
    root = ET.parse(path).getroot()
    cases = list(root.iter("testcase"))
    for case in cases:
        if any(case.find(tag) is not None for tag in ["failure", "error", "skipped"]):
            raise ValueError("Required E2E case failed or skipped: " + case.get("name", ""))
    if kind == "browser":
        projects = {suite.get("hostname"): suite for suite in root.iter("testsuite")}
        if set(projects) != {"desktop", "mobile"} or len(cases) != 10:
            raise ValueError("Exactly five browser cases in both required viewports are mandatory")
        for suite in projects.values():
            if Counter(c.get("name") for c in suite.iter("testcase")) != Counter(BROWSER):
                raise ValueError("A required browser scenario is missing or duplicated")
    else:
        if len(cases) != 2:
            raise ValueError("Both actual Maestro flows must execute")
        names = [case.get("name", "") for case in cases]
        if any(sum(name in actual for actual in names) != 1 for name in ANDROID):
            raise ValueError("Required native flow is missing or duplicated: " + str(names))
    return len(cases)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=["android", "browser"])
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    print(f"{args.kind}: {validate(args.kind, args.report)} required E2E cases passed; zero skips")
