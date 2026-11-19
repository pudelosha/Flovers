"""Summarize existing JUnit/Jest and coverage reports without third-party packages."""

from __future__ import annotations

import argparse
from collections import Counter
import html
import json
import os
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


def markdown(value):
    return html.escape(" ".join(str(value).split())).replace("|", "&#124;").replace("`", "&#96;")


def junit_results(path, outcomes=None):
    root = ET.parse(path).getroot()
    cases = list(root.iter("testcase"))
    if not cases:
        raise ValueError("JUnit report contains no test cases")
    counts = Counter()
    skips = []
    for case in cases:
        identity = f"{case.get('classname', '')}::{case.get('name', '')}"
        skipped = case.find("skipped")
        if skipped is not None:
            outcome = "skipped"
            counts["skipped"] += 1
            reason = skipped.get("message") or skipped.text or "No skip reason recorded"
            skips.append((case.get("classname", ""), case.get("name", ""), reason.strip()))
        elif case.find("error") is not None:
            outcome = "error"
            counts["errors"] += 1
        elif case.find("failure") is not None:
            outcome = "failed"
            counts["failed"] += 1
        else:
            outcome = "passed"
            counts["passed"] += 1
        if outcomes is not None:
            if identity in outcomes:
                raise ValueError(f"Duplicate JUnit test identity: {identity}")
            outcomes[identity] = outcome
    return counts, skips


def jest_results(path):
    report = json.loads(Path(path).read_text(encoding="utf-8"))
    counts = Counter({
        "passed": report["numPassedTests"],
        "failed": report["numFailedTests"],
        "skipped": report["numPendingTests"],
        "todo": report.get("numTodoTests", 0),
        "errors": report.get("numRuntimeErrorTestSuites", 0),
    })
    if not report.get("numTotalTests"):
        raise ValueError("Jest report contains no tests")
    skips = []
    for suite in report.get("testResults", []):
        for test in suite.get("assertionResults", []):
            if test["status"] in {"pending", "skipped", "disabled", "todo"}:
                skips.append((Path(suite["name"]).name, test["fullName"],
                              "TODO" if test["status"] == "todo" else "Jest skip: no reason recorded"))
    # A failed suite can have no failed assertions (for example an import error).
    if report.get("numFailedTestSuites") and not (counts["failed"] or counts["errors"]):
        counts["errors"] = report["numFailedTestSuites"]
    return counts, skips


def coverage_counts(path, kind):
    report = json.loads(Path(path).read_text(encoding="utf-8"))
    if kind == "python":
        total = report["totals"]
        return [("Lines", total["covered_lines"], total["num_statements"]),
                ("Branches", total["covered_branches"], total["num_branches"])]
    total = report["total"]
    return [(label.title(), total[label]["covered"], total[label]["total"])
            for label in ("lines", "branches")]


def policy_violations(path, counts, skips, outcomes):
    """Only exact, explained exceptions may skip; required cases must pass."""
    policy = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(policy, dict) or policy.get("format") != 1:
        raise ValueError("Unsupported test policy format")
    if not isinstance(policy.get("allowed_skips"), list):
        raise ValueError("allowed_skips must be a list of exact exceptions")
    allowed = {}
    for entry in policy["allowed_skips"]:
        if not isinstance(entry, dict) or not all(isinstance(entry.get(key), str) and entry[key].strip()
                   for key in ("test", "reason", "justification")):
            raise ValueError("Every skip exception needs an exact test, reason and justification")
        if entry["test"] in allowed:
            raise ValueError(f"Duplicate skip exception: {entry['test']}")
        allowed[entry["test"]] = entry["reason"]
    required = policy["required_passed"]
    if not isinstance(required, list) or any(not isinstance(name, str) or not name.strip() for name in required):
        raise ValueError("required_passed must be a list of exact test identities")
    if len(required) != len(set(required)):
        raise ValueError("Duplicate required test identity")
    if set(required) & allowed.keys():
        raise ValueError("A required test cannot also be allowed to skip")
    violations = []
    if len(skips) != counts["skipped"] + counts["todo"]:
        violations.append("Skipped/TODO counts do not match the detailed test records")
    for module, name, reason in skips:
        identity = f"{module}::{name}"
        if allowed.get(identity) != reason:
            violations.append(f"Unexpected skipped/TODO test: {identity} ({reason})")
    for identity in required:
        if outcomes.get(identity) != "passed":
            violations.append(f"Required test did not pass: {identity} ({outcomes.get(identity, 'not collected')})")
    return violations, len(required)


def render_report(title, counts, skips, coverage=None, coverage_scope=None):
    counts = Counter(counts)
    lines = [f"## {markdown(title)}", "", "| Passed | Failed | Errors | Skipped | TODO |",
             "| ---: | ---: | ---: | ---: | ---: |",
             "| " + " | ".join(str(counts[k]) for k in ("passed", "failed", "errors", "skipped", "todo")) + " |", ""]
    if coverage is not None:
        lines += ["### Coverage", "", "| Metric | Covered / total | Coverage |", "| --- | ---: | ---: |"]
        for label, covered, total in coverage:
            percent = f"{100 * covered / total:.2f}%" if total else "N/A"
            lines.append(f"| {label} | {covered} / {total} | {percent} |")
        lines.append("")
    if coverage_scope:
        lines += [markdown(coverage_scope), ""]
    if skips:
        lines += ["### Skipped tests", "", "| Count | Reason |", "| ---: | --- |"]
        for reason, count in Counter(row[2] for row in skips).most_common():
            lines.append(f"| {count} | {markdown(reason)} |")
        lines += ["", "<details><summary>Skipped test names</summary>", ""]
        lines.extend(f"- {markdown(module)}: {markdown(name)} — {markdown(reason)}"
                     for module, name, reason in skips)
        lines += ["", "</details>", ""]
    else:
        lines += ["No skipped tests were recorded.", ""]
    lines += ["No coverage-percentage threshold is applied by this report.", ""]
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title", required=True)
    reports = parser.add_mutually_exclusive_group(required=True)
    reports.add_argument("--junit", type=Path)
    reports.add_argument("--jest", type=Path)
    parser.add_argument("--coverage", type=Path)
    parser.add_argument("--coverage-kind", choices=("python", "jest"))
    parser.add_argument("--coverage-scope")
    parser.add_argument("--policy", type=Path, help="Fail on unexpected skips or missing/non-passing required cases")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.coverage and not args.coverage_kind:
            raise ValueError("--coverage requires --coverage-kind")
        outcomes = {}
        counts, skips = junit_results(args.junit, outcomes) if args.junit else jest_results(args.jest)
        coverage = coverage_counts(args.coverage, args.coverage_kind) if args.coverage else None
        summary = render_report(args.title, counts, skips, coverage, args.coverage_scope)
        status = int(bool(counts["failed"] or counts["errors"]))
        if args.policy:
            violations, required_count = policy_violations(args.policy, counts, skips, outcomes)
            summary += f"\n### Test execution policy\n\nRequired passing cases: {required_count}.\n\n"
            if violations:
                summary += "**Policy failed:**\n\n" + "\n".join(f"- {markdown(item)}" for item in violations) + "\n"
                status = 1
            else:
                summary += "Policy passed: no unexpected skips/TODOs; all required cases passed.\n"
    except (OSError, ValueError, KeyError, TypeError, ET.ParseError) as exc:
        summary = (f"## {markdown(args.title)}\n\n"
                   f"**Reporting failed:** {markdown(exc)}. Check earlier steps; missing reports are not a passing test run.\n")
        status = 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(summary, encoding="utf-8")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as stream:
            stream.write(summary + "\n")
    print(summary)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
