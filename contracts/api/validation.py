"""Small explicit subset contracts; additive provider fields remain compatible."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
BASELINE = "6f698097ddb17f7740dada6ce37beba1a28ff34e"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def manifest():
    value = json.loads((ROOT / "scenarios.json").read_text(encoding="utf-8"))
    assert value["format"] == 1 and value["previous_mobile_commit"] == BASELINE
    ids = [row["id"] for row in value["scenarios"]]
    assert len(ids) == len(set(ids)) and len(ids) >= 70
    return value


def assert_contract(value, expectations):
    missing = object()
    for path, expected in expectations.items():
        actual = value
        for key in path.split("."):
            if isinstance(actual, list) and key.isdigit():
                actual = actual[int(key)] if int(key) < len(actual) else missing
            elif isinstance(actual, dict):
                actual = actual.get(key, missing)
            else:
                actual = missing
        if isinstance(expected, dict) and expected.get("$absent"):
            assert actual is missing, path
        elif isinstance(expected, dict) and "$type" in expected:
            kind = {"string": str, "array": list, "number": (float, int), "boolean": bool}[expected["$type"]]
            assert isinstance(actual, kind), (path, actual)
        else:
            assert actual == expected, (path, actual, expected)


def verify_previous_sources():
    metadata = json.loads((ROOT / "previous.json").read_text())
    assert metadata["commit"] == BASELINE
    for entry in metadata["files"]:
        raw = (ROOT / entry["path"]).read_bytes()
        assert digest(raw) == entry["sha256"], entry["path"]
        blob = b"blob " + str(len(raw)).encode() + b"\0" + raw
        assert hashlib.sha1(blob).hexdigest() == entry["git_blob"], entry["path"]


def validate_bundle(bundle, provider_sha):
    spec = manifest()
    assert re.fullmatch(r"[a-f0-9]{40}", provider_sha), "An exact provider commit is required"
    assert bundle["format"] == 1 and bundle["verified"] is True
    assert bundle["provider_sha"] == provider_sha
    assert bundle["manifest_sha256"] == digest((ROOT / "scenarios.json").read_bytes())
    assert bundle["previous_mobile_commit"] == BASELINE
    assert set(bundle["cases"]) == {item["id"] for item in spec["scenarios"]}
    for case in bundle["cases"].values():
        assert case["exchanges"]
        for exchange in case["exchanges"]:
            assert exchange["sha256"] == digest(canonical(exchange["response"]))
            assert exchange["canonical_response"] == canonical(exchange["response"]).decode()
    verify_previous_sources()
    return bundle
