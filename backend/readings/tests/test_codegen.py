import os
from pathlib import Path
import shlex
import shutil
import subprocess
import ssl

import pytest

from readings.codegen import _section_pump_helpers, _section_types, generate_arduino_code


@pytest.mark.parametrize("interval_hours", [0, -1, 25])
def test_firmware_rejects_invalid_sampling_interval(interval_hours):
    with pytest.raises(ValueError):
        generate_arduino_code(
            base_url="https://api.example.com", secret="test-secret",
            device_id=1, device_key="DEVICE", interval_hours=interval_hours,
        )


@pytest.mark.parametrize("minutes", [1, 15, 60, 90, 1440])
@pytest.mark.parametrize("pump", [False, True])
def test_firmware_embeds_minute_interval_for_both_variants(minutes, pump):
    code = generate_arduino_code(base_url="https://api.example.com", secret="test-secret",
                                device_id=1, device_key="DEVICE", interval_minutes=minutes, pump_included=pump)
    assert f"SEND_INTERVAL_MS = {minutes}UL * 60UL * 1000UL;" in code
    assert "const unsigned long PUMP_RUN_MS = 30000UL;" in code if pump else "PUMP_RUN_MS" not in code


@pytest.mark.parametrize("minutes", [0, -1, 1441, 1.5, True])
def test_firmware_rejects_invalid_minute_intervals(minutes):
    with pytest.raises(ValueError):
        generate_arduino_code(base_url="https://api.example.com", secret="test-secret",
                              device_id=1, device_key="DEVICE", interval_minutes=minutes)


def test_firmware_legacy_hour_interval_is_preserved():
    code = generate_arduino_code(base_url="https://api.example.com", secret="test-secret",
                                device_id=1, device_key="DEVICE", interval_hours=3)
    assert "SEND_INTERVAL_MS = 180UL * 60UL * 1000UL;" in code


def test_generated_pump_retries_do_not_repeat_physical_execution(tmp_path):
    compiler = shlex.split(os.environ.get("FLOVERS_TEST_CPP", ""))
    if not compiler:
        cpp = shutil.which("clang++") or shutil.which("g++")
        if not cpp:
            pytest.skip("Set FLOVERS_TEST_CPP or install a C++ compiler for the firmware host check")
        compiler = [cpp]
    harness = Path(__file__).with_name("firmware_pump_harness.cpp").read_text(encoding="utf-8")
    source = tmp_path / "pump.cpp"
    source.write_text(
        harness.replace("// GENERATED_TYPES", _section_types(pump_enabled=True)).replace(
            "// GENERATED_PUMP_HELPERS", _section_pump_helpers()
        ),
        encoding="utf-8",
    )
    binary = tmp_path / ("pump.exe" if os.name == "nt" else "pump")
    compiled = subprocess.run(
        [*compiler, "-std=c++17", str(source), "-o", str(binary)],
        capture_output=True, text=True, timeout=120,
    )
    assert compiled.returncode == 0, compiled.stdout + compiled.stderr
    result = subprocess.run([str(binary)], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "checks passed" in result.stdout


@pytest.mark.parametrize("pump_enabled", [False, True], ids=["sensors-only", "with-pump"])
def test_generated_sketch_compiles_with_arduino_preprocessing(tmp_path, pump_enabled):
    cli = os.environ.get("FLOVERS_TEST_ARDUINO_CLI")
    if not cli:
        pytest.skip("Set FLOVERS_TEST_ARDUINO_CLI to run the ESP32 Arduino build check")
    # Arduino generates prototypes before compiling .ino files. A direct C++
    # compile misses errors caused by prototypes referring to later types.
    sketch = tmp_path / "flovers_firmware"
    sketch.mkdir()
    (sketch / "flovers_firmware.ino").write_text(
        generate_arduino_code(
            base_url="https://api.example.com", secret="not-a-real-secret",
            device_id=1, device_key="DEVICE", pump_included=pump_enabled,
        ),
        encoding="utf-8",
    )
    result = subprocess.run(
        [
            cli, "compile", "--fqbn",
            os.environ.get("FLOVERS_TEST_ARDUINO_FQBN", "esp32:esp32:esp32c3:CDCOnBoot=cdc"),
            "--build-path", str(tmp_path / "build"), str(sketch),
        ],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_generated_https_verifies_server_using_valid_trust_anchors():
    code = generate_arduino_code(base_url="https://api.example.com", secret="not-a-real-secret", device_id=1, device_key="DEVICE", pump_included=True)
    assert "client.setInsecure()" not in code
    assert "client.setCACert(TLS_ROOT_CA);" in code
    assert "Serial.println(json)" not in code
    pem = code.split('R"FLOVERS_CA(\n', 1)[1].split('\n)FLOVERS_CA"', 1)[0]
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_verify_locations(cadata=pem)
    assert context.cert_store_stats()["x509_ca"] == 2


@pytest.mark.parametrize("base", ["http://api.example.com", "https://user:password@api.example.com", "https://api.example.com?token=secret"])
def test_firmware_never_generates_plaintext_or_credential_bearing_urls(base):
    with pytest.raises(ValueError):
        generate_arduino_code(base_url=base, secret="test", device_id=1, device_key="DEVICE")
