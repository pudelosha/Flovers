import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess

import pytest

from readings.codegen import _section_reading_payload, _section_types


BASE_METRICS = {"temperature": 22.5, "humidity": 41, "light": 600, "moisture": 35}
PAYLOAD_CASES = [
    ("valid", {}),
    ("temperature_nan", {"temperature": None}),
    ("temperature_infinity", {"temperature": None}),
    ("temperature_negative_infinity", {"temperature": None}),
    ("temperature_below_zero", {"temperature": -5.5}),
    ("humidity_nan", {"humidity": None}),
    ("humidity_infinity", {"humidity": None}),
    ("humidity_negative_infinity", {"humidity": None}),
    ("humidity_below_zero", {"humidity": None}),
    ("humidity_above_hundred", {"humidity": None}),
    ("humidity_zero", {"humidity": 0}),
    ("humidity_hundred", {"humidity": 100}),
    ("light_no_data", {"light": None}),
    ("light_unconfigured", {"light": None}),
    ("light_nan", {"light": None}),
    ("light_infinity", {"light": None}),
    ("light_negative_infinity", {"light": None}),
    ("light_zero", {"light": 0}),
    ("failed_float_sensors", {"temperature": None, "humidity": None, "light": None}),
]


def reject_nonfinite_constant(value):
    raise ValueError(f"Nonfinite value is not valid JSON: {value}")


@pytest.fixture(scope="module")
def firmware_payloads(tmp_path_factory):
    compiler = shlex.split(os.environ.get("FLOVERS_TEST_CPP", ""))
    if not compiler:
        cpp = shutil.which("clang++") or shutil.which("g++")
        if not cpp:
            pytest.skip("Set FLOVERS_TEST_CPP or install a C++ compiler for the firmware host check")
        compiler = [cpp]

    directory = tmp_path_factory.mktemp("firmware_payload")
    source = directory / "payload.cpp"
    harness = Path(__file__).with_name("firmware_payload_harness.cpp").read_text(encoding="utf-8")
    source.write_text(
        harness.replace("// GENERATED_SENSOR_TYPES", _section_types(pump_enabled=False))
        .replace("// GENERATED_READING_PAYLOAD", _section_reading_payload()),
        encoding="utf-8",
    )
    binary = directory / ("payload.exe" if os.name == "nt" else "payload")
    compiled = subprocess.run(
        [*compiler, "-std=c++17", str(source), "-o", str(binary)],
        capture_output=True, text=True, timeout=120,
    )
    assert compiled.returncode == 0, compiled.stdout + compiled.stderr
    result = subprocess.run([str(binary)], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout + result.stderr

    payloads = {}
    for line in result.stdout.splitlines():
        name, encoded = line.split("\t", 1)
        assert name not in payloads, f"Duplicate firmware case: {name}"
        payloads[name] = json.loads(encoded, parse_constant=reject_nonfinite_constant)
    assert set(payloads) == {name for name, _ in PAYLOAD_CASES} | {"disabled_float_sensors"}
    return payloads


@pytest.mark.parametrize("case,changes", PAYLOAD_CASES, ids=[case for case, _ in PAYLOAD_CASES])
def test_generated_payload_preserves_healthy_metrics_and_marks_failed_sensors_null(
    firmware_payloads, case, changes,
):
    assert firmware_payloads[case] == {
        "secret": "test-secret",
        "device_key": "DEVICE",
        "device_id": 7,
        "timestamp": "2026-05-05T10:15:00Z",
        "metrics": {**BASE_METRICS, **changes},
    }


def test_generated_payload_omits_disabled_sensors(firmware_payloads):
    assert firmware_payloads["disabled_float_sensors"]["metrics"] == {"moisture": 35}
