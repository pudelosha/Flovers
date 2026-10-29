"""Validate locale structure and runtime tokens without network or application settings.

Usage: python translations/validate_locales.py id ru tr
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ROOTS = ("mobile/src/i18n/locales", "web/src/locales", "backend/i18n/locales")
TOKENS = re.compile(
    r"\{\{.*?\}\}|\$\{[^}]+\}|\{[\w.]+\}|<[^>]+>|`[^`]+`|"
    r'https?://[^\s<>"\)]+|[\w.+-]+@[\w.-]+\.[a-zA-Z]+|%\([^)]+\)[sdf]|%[sdf]'
)


def compare(source, target, path):
    if type(source) is not type(target):
        return [f"{path}: different value type"]
    if isinstance(source, dict):
        issues = []
        if source.keys() != target.keys():
            issues.append(f"{path}: missing/extra keys {source.keys() ^ target.keys()}")
        for key in source.keys() & target.keys():
            issues.extend(compare(source[key], target[key], f"{path}.{key}"))
        return issues
    if isinstance(source, list):
        issues = [] if len(source) == len(target) else [f"{path}: different array length"]
        for index, (left, right) in enumerate(zip(source, target)):
            issues.extend(compare(left, right, f"{path}[{index}]"))
        return issues
    if isinstance(source, str):
        issues = []
        if source.strip() and not target.strip():
            issues.append(f"{path}: empty translation")
        if Counter(TOKENS.findall(source)) != Counter(TOKENS.findall(target)):
            issues.append(f"{path}: changed placeholder, markup, URL or code")
        if re.search(r"ZX(?:Q\d|START|END)", target):
            issues.append(f"{path}: unfinished translation marker")
        return issues
    return [] if source == target else [f"{path}: changed non-text value"]


def main(languages):
    issues = []
    files = 0
    for root in ROOTS:
        base = PROJECT / root
        sources = {p.relative_to(base / "en"): p for p in (base / "en").rglob("*.json")}
        for lang in languages:
            targets = {p.relative_to(base / lang): p for p in (base / lang).rglob("*.json")}
            if sources.keys() != targets.keys():
                issues.append(f"{root}/{lang}: missing/extra files {sources.keys() ^ targets.keys()}")
            for relative in sources.keys() & targets.keys():
                try:
                    source = json.loads(sources[relative].read_text(encoding="utf-8-sig"))
                    target = json.loads(targets[relative].read_text(encoding="utf-8-sig"))
                    issues.extend(compare(source, target, f"{root}/{lang}/{relative}"))
                    files += 1
                except (ValueError, OSError) as exc:
                    issues.append(f"{root}/{lang}/{relative}: {exc}")
    for issue in issues:
        print(issue)
    print(f"Checked {files} locale files; {len(issues)} issues.")
    return bool(issues)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:] or ["id", "ru", "tr"]))
