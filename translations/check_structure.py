import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, List, Optional

import config


@dataclass
class CompareResult:
    lang: str
    status: str  # OK / MISSING / INVALID / DIFF / ERROR
    file_path: Path
    message: str = ""
    diffs: List[str] = field(default_factory=list)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare EN JSON structure against configured target language files."
    )
    parser.add_argument(
        "input_file",
        type=str,
        help=r"Path to source EN JSON file, e.g. C:\...\locales\en\locations.json",
    )
    return parser.parse_args()


def validate_input_file(path_str: str) -> Path:
    p = Path(path_str)

    if not p.exists():
        raise FileNotFoundError(f"Input file does not exist: {p}")

    if not p.is_file():
        raise ValueError(f"Input path is not a file: {p}")

    if p.suffix.lower() != ".json":
        raise ValueError(f"Input file must be a .json file: {p}")

    if config.REQUIRE_SOURCE_LANG_SEGMENT:
        parts = [part.lower() for part in p.parts]
        if config.SOURCE_LANG.lower() not in parts:
            raise ValueError(
                f"Input path must contain a '{config.SOURCE_LANG}' path segment, got: {p}"
            )

    return p


def read_json_file(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def derive_output_path(source_en_path: Path, target_lang: str) -> Path:
    parts = list(source_en_path.parts)
    replaced = False

    for i, part in enumerate(parts):
        if part.lower() == config.SOURCE_LANG.lower():
            parts[i] = target_lang
            replaced = True
            break

    if not replaced:
        raise ValueError(
            f"Could not derive output path because '{config.SOURCE_LANG}' segment was not found in: {source_en_path}"
        )

    return Path(*parts)


def format_path(path: str) -> str:
    return path if path else "$"


def compare_structures(source: Any, target: Any, path: str = "") -> List[str]:
    diffs: List[str] = []

    if type(source) is not type(target):
        diffs.append(
            f"{format_path(path)}: type mismatch - source={type(source).__name__}, target={type(target).__name__}"
        )
        return diffs

    if isinstance(source, dict):
        source_keys = list(source.keys())
        target_keys = list(target.keys())

        if source_keys != target_keys:
            source_key_set = set(source_keys)
            target_key_set = set(target_keys)

            missing = [k for k in source_keys if k not in target_key_set]
            extra = [k for k in target_keys if k not in source_key_set]

            if missing:
                diffs.append(
                    f"{format_path(path)}: missing keys in target: {missing}"
                )

            if extra:
                diffs.append(
                    f"{format_path(path)}: extra keys in target: {extra}"
                )

            common_source_order = [k for k in source_keys if k in target_key_set]
            common_target_order = [k for k in target_keys if k in source_key_set]
            if common_source_order != common_target_order:
                diffs.append(
                    f"{format_path(path)}: key order mismatch"
                )

        for key in source_keys:
            if key in target:
                child_path = f"{path}.{key}" if path else key
                diffs.extend(compare_structures(source[key], target[key], child_path))

        return diffs

    if isinstance(source, list):
        if len(source) != len(target):
            diffs.append(
                f"{format_path(path)}: list length mismatch - source={len(source)}, target={len(target)}"
            )
            return diffs

        for i, (s_item, t_item) in enumerate(zip(source, target)):
            child_path = f"{path}[{i}]" if path else f"[{i}]"
            diffs.extend(compare_structures(s_item, t_item, child_path))

        return diffs

    return diffs


def compare_one_language(source_en_path: Path, source_data: Any, target_lang: str) -> CompareResult:
    target_path = derive_output_path(source_en_path, target_lang)

    if not target_path.exists():
        return CompareResult(
            lang=target_lang,
            status="MISSING",
            file_path=target_path,
            message="Target file does not exist",
        )

    if not target_path.is_file():
        return CompareResult(
            lang=target_lang,
            status="ERROR",
            file_path=target_path,
            message="Target path exists but is not a file",
        )

    try:
        target_data = read_json_file(target_path)
    except Exception as e:
        return CompareResult(
            lang=target_lang,
            status="INVALID",
            file_path=target_path,
            message=f"Invalid JSON: {str(e)[:200]}",
        )

    diffs = compare_structures(source_data, target_data)

    if diffs:
        return CompareResult(
            lang=target_lang,
            status="DIFF",
            file_path=target_path,
            message=f"{len(diffs)} structural difference(s) found",
            diffs=diffs,
        )

    return CompareResult(
        lang=target_lang,
        status="OK",
        file_path=target_path,
        message="Structure matches",
    )


def print_result(result: CompareResult):
    print(f"{result.lang}: {result.status} - {result.message}")
    print(f"  -> {result.file_path}")

    if result.diffs:
        for diff in result.diffs:
            print(f"     - {diff}")


def main():
    args = parse_args()

    try:
        source_en_path = validate_input_file(args.input_file)
        source_data = read_json_file(source_en_path)
    except Exception as e:
        print(f"INPUT ERROR: {e}")
        return

    print(f"Source EN file: {source_en_path}")
    print(f"Checking languages: {', '.join(config.TARGET_LANGS)}")
    print()

    ok = 0
    missing = 0
    invalid = 0
    diff = 0
    err = 0

    for lang in config.TARGET_LANGS:
        result = compare_one_language(source_en_path, source_data, lang)
        print_result(result)

        if result.status == "OK":
            ok += 1
        elif result.status == "MISSING":
            missing += 1
        elif result.status == "INVALID":
            invalid += 1
        elif result.status == "DIFF":
            diff += 1
        else:
            err += 1

        print()

    print(
        f"DONE -> OK={ok}, MISSING={missing}, INVALID={invalid}, DIFF={diff}, ERROR={err}"
    )


if __name__ == "__main__":
    main()