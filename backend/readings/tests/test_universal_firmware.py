"""Universal source safety, factory records and mandatory real ESP32 compilation."""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import shlex
import shutil
from copy import deepcopy
from types import SimpleNamespace

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
import pytest

from readings import codegen
from readings.universal_codegen import generate_universal_firmware


@pytest.mark.parametrize("pump", [False, True])
def test_universal_uses_shared_sensor_pump_protocol_and_existing_pins(pump):
    files = generate_universal_firmware(base_url="https://synthetic.example", pump_included=pump)
    sketch, support = files["flovers_universal.ino"], files["FloversUniversal.h"]
    assert codegen._section_pins(pump_enabled=pump) in sketch
    assert codegen._section_read_sensors() in sketch
    assert codegen._section_cycle(pump_enabled=pump) in sketch
    if pump:
        assert codegen._section_pump_helpers(hardware_cooldown=True) in sketch
        assert "pinMode(PUMP_PIN, OUTPUT); digitalWrite(PUMP_PIN, LOW);" in sketch
        setup = sketch.split("void setup()", 1)[1]
        assert setup.index("digitalWrite(PUMP_PIN, LOW)") < setup.index("Flovers::begin()")
    assert "setInsecure" not in sketch + support
    assert 'http.addHeader("X-Flovers-Device-Token", deviceToken)' in sketch
    assert "Serial.println(responseBody)" not in sketch
    assert 'const char* secret = "";' in sketch
    assert "YOUR_WIFI_PASSWORD" not in sketch
    assert "NETWORK_PROV_SECURITY_1" in support
    assert 'response["in_progress"] = commandInFlight.load()' in support
    assert 'response["operation_state"] = operationState.load()' in support
    assert 'operationState.store(success ? "applied" : "failed")' in support
    assert "SCHEME_SOFTAP" not in support
    assert 'endpoint_unregister("prov-config")' in support
    assert 'endpoint_unregister("prov-ctrl")' in support
    assert "NETWORK_PROV_SECURITY_0" not in support
    assert "reset_wifi_provisioning" not in support
    assert "nvs_flash_erase" not in support
    assert "GPIO9" not in support and "BOOT" not in support


@pytest.mark.parametrize("base", ["http://bad.test", "https://user:pass@bad.test", "https://bad.test/?token=bad", "https://bad.test/path", "https://bad.test/#bad"])
def test_universal_rejects_unsafe_backend_origins(base):
    with pytest.raises(ValueError): generate_universal_firmware(base_url=base)


def test_universal_keeps_atomic_config_wifi_binding_and_pump_records_separate():
    support = generate_universal_firmware(base_url="https://test.example")["FloversUniversal.h"]
    for name in ("flovers-factory", "flovers-bind", "flovers-conf", "flovers-net"):
        assert name in support
    assert 'saveRecord("flovers-pump"' not in support
    assert 'remove("cooldown")' not in support
    assert "configurationApplied = false" in support
    assert '"offline_automatic_watering_allowed"' in generate_universal_firmware(base_url="https://test.example")["FloversValidation.h"]
    assert 'cached["binding_digest"] == sha256(deviceToken)' in support
    assert "!Flovers::ready()" in generate_universal_firmware(base_url="https://test.example")["flovers_universal.ino"]


@pytest.mark.firmware_compile
def test_native_configuration_and_storage_failure_paths(tmp_path):
    """Execute the same C++ validator/commit code used on the board, not a Python model."""
    from readings.provisioning import runtime_config
    compiler = shlex.split(os.environ.get("FLOVERS_TEST_CPP", ""))
    if not compiler:
        found = shutil.which("g++") or shutil.which("clang++")
        if not found: pytest.fail("Native firmware safety checks require a host C++ compiler")
        compiler = [found]
    include = os.environ.get("FLOVERS_TEST_ARDUINO_JSON_INCLUDE")
    if not include or not (Path(include) / "ArduinoJson.h").exists():
        pytest.fail("Pinned ArduinoJson headers are required for real native validation")
    device = SimpleNamespace(desired_config_version=1, effective_interval_minutes=60, pump_duration_seconds=20,
        pump_cooldown_minutes=60, pump_threshold_pct=30, automatic_pump_launch=False, pump_included=True,
        sensors={"temperature": True, "humidity": True, "light": True, "moisture": True}, is_active=True, plant_id=1)
    base = runtime_config(device)  # Actual provider configuration, not independently maintained response mocks.
    rows = [{"name": "actual-provider-defaults", "configuration": base, "pump_capable": True, "expected": True}]
    changes = [
        ("reading_interval_minutes", 0), ("reading_interval_minutes", 1441), ("reading_interval_minutes", 1.5),
        ("pump_duration_seconds", 0), ("pump_duration_seconds", 301), ("pump_duration_seconds", True),
        ("pump_cooldown_minutes", 0), ("pump_cooldown_minutes", 32768),
        ("pump_threshold_pct", -1), ("pump_threshold_pct", 101), ("pump_threshold_pct", "30"),
        ("version", 0), ("version", -1), ("version", "1"),
        ("enabled", "true"), ("pump_included", "true"), ("automatic_watering", "false"),
        ("backend_pump_authorization_required", False), ("offline_automatic_watering_allowed", True),
        ("sensors", {"moisture": "true"}),
    ]
    for field, value in changes:
        config = deepcopy(base); config[field] = value
        rows.append({"name": f"invalid-{field}-{value}", "configuration": config, "pump_capable": True, "expected": False})
    for field, values in (("reading_interval_minutes", [1, 1440]), ("pump_duration_seconds", [1, 300]),
                          ("pump_cooldown_minutes", [1, 32767]), ("pump_threshold_pct", [0, 100, 25.5])):
        for value in values:
            config = deepcopy(base); config[field] = value
            rows.append({"name": f"valid-{field}-{value}", "configuration": config, "pump_capable": True, "expected": True})
    rows.append({"name": "pump-on-sensors-only-binary", "configuration": base, "pump_capable": False, "expected": False})
    config = deepcopy(base); config["pump_included"] = False
    rows.append({"name": "sensors-only", "configuration": config, "pump_capable": False, "expected": True})
    for key in ("version", "sensors", "enabled", "backend_pump_authorization_required", "offline_automatic_watering_allowed"):
        config = deepcopy(base); del config[key]
        rows.append({"name": f"missing-{key}", "configuration": config, "pump_capable": True, "expected": False})
    config = deepcopy(base); config.update(automatic_watering=True, pump_threshold_pct=None)
    rows.append({"name": "automatic-without-threshold", "configuration": config, "pump_capable": True, "expected": False})
    config = deepcopy(base); config["automatic_watering"] = True; config["sensors"]["moisture"] = False
    rows.append({"name": "automatic-without-moisture-sensor", "configuration": config, "pump_capable": True, "expected": False})
    vectors = tmp_path / "vectors.json"; vectors.write_text(json.dumps(rows))
    source = Path(__file__).with_name("universal_state_harness.cpp")
    binary = tmp_path / ("state.exe" if os.name == "nt" else "state")
    compiled = subprocess.run([*compiler, "-std=c++17", "-I", include, "-I", str(source.parents[1] / "firmware"),
        str(source), "-o", str(binary)], capture_output=True, text=True, timeout=120)
    assert compiled.returncode == 0, compiled.stdout + compiled.stderr
    result = subprocess.run([str(binary), str(vectors)], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "checks passed" in result.stdout


def test_hardware_cooldown_is_preserved_across_logical_rebinding():
    original = codegen._section_pump_helpers()
    universal = codegen._section_pump_helpers(hardware_cooldown=True)
    assert universal == original.replace("String(record.deviceKey) == String(deviceKey) && record.notBefore > now", "record.notBefore > now").replace(
        "String(record.deviceKey) != String(deviceKey) || record.notBefore < until", "record.notBefore < until")
    assert "claimAutomaticPump(moisture)" in universal
    assert "if (taskId <= 0)" in universal


def test_universal_pump_receipts_and_rebind_cooldown_execute_actual_cpp(tmp_path):
    compiler = shlex.split(os.environ.get("FLOVERS_TEST_CPP", ""))
    if not compiler:
        found = shutil.which("g++") or shutil.which("clang++")
        if not found: pytest.fail("Universal pump safety checks require a host C++ compiler")
        compiler = [found]
    harness = Path(__file__).with_name("firmware_pump_harness.cpp").read_text(encoding="utf-8")
    marker = "// Reboot loses RAM counters, but the persisted boundary blocks watering."
    assert harness.count(marker) == 1
    harness = harness.replace(marker, '''
    // Changing the logical binding must not reset the physical cooldown.
    deviceKey = "NEW-BINDING";
    assert(automaticPumpCooldownActive());
    PumpSafetyRecord priorBoundary = {}, afterBoundary = {};
    assert(readPumpSafety(priorBoundary));
    assert(reservePumpSafety(1));
    assert(readPumpSafety(afterBoundary));
    assert(afterBoundary.notBefore >= priorBoundary.notBefore);
    deviceKey = "DEVICE";
    ''' + marker)
    source = tmp_path / "universal_pump.cpp"
    source.write_text(harness.replace("// GENERATED_TYPES", codegen._section_types(pump_enabled=True)).replace(
        "// GENERATED_PUMP_HELPERS", codegen._section_pump_helpers(hardware_cooldown=True)), encoding="utf-8")
    binary = tmp_path / ("pump.exe" if os.name == "nt" else "pump")
    compiled = subprocess.run([*compiler, "-std=c++17", str(source), "-o", str(binary)], capture_output=True, text=True, timeout=120)
    assert compiled.returncode == 0, compiled.stdout + compiled.stderr
    result = subprocess.run([str(binary)], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "checks passed" in result.stdout


def test_factory_records_have_unique_keys_and_only_public_enrollment(tmp_path):
    script = Path(__file__).parents[3] / "firmware/factory/create_identity.py"
    spec = importlib.util.spec_from_file_location("factory_identity", script)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    first = module.create_identity(tmp_path / "one", "FACTORY_TEST_0001")
    second = module.create_identity(tmp_path / "two", "FACTORY_TEST_0002")
    private = json.loads((tmp_path / "one/factory-private.json").read_text())
    seed = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private["seed"]))
    assert base64.b64encode(seed.public_key().public_bytes_raw()).decode() == first["bootstrap_public_key"]
    assert hashlib.sha256(private["pop"].encode()).hexdigest() == first["provisioning_pop_digest"]
    assert first["bootstrap_public_key"] != second["bootstrap_public_key"]
    assert first["provisioning_pop_digest"] != second["provisioning_pop_digest"]
    assert not {"seed", "pop", "device_token", "secret"} & first.keys()
    with pytest.raises(FileExistsError): module.create_identity(tmp_path / "one", "FACTORY_TEST_0001")
    repository = tmp_path / "repository"; repository.mkdir(); (repository / ".git").mkdir()
    with pytest.raises(ValueError): module.create_identity(repository / "secrets", "FACTORY_TEST_0001")


@pytest.mark.firmware_compile
@pytest.mark.parametrize("pump", [False, True], ids=["sensors-only", "with-pump"])
def test_universal_sketch_compiles_for_esp32c3(tmp_path, pump):
    cli = os.environ.get("FLOVERS_TEST_ARDUINO_CLI")
    if not cli: pytest.fail("Universal compilation requires the pinned Arduino CLI")
    variant = "universal-pump" if pump else "universal-sensors"
    artifacts = Path(os.environ.get("FLOVERS_TEST_ARDUINO_ARTIFACTS", str(tmp_path))) / variant
    sketch = artifacts / "flovers_universal"; sketch.mkdir(parents=True, exist_ok=True)
    for name, contents in generate_universal_firmware(base_url="https://api.example.com", pump_included=pump).items():
        (sketch / name).write_text(contents, encoding="utf-8")
    command = [cli]
    if os.environ.get("FLOVERS_TEST_ARDUINO_CONFIG"): command += ["--config-file", os.environ["FLOVERS_TEST_ARDUINO_CONFIG"]]
    # BLE + TLS exceeds the old dual-OTA-slot app partition. Universal has no OTA.
    fqbn = os.environ.get("FLOVERS_TEST_ARDUINO_FQBN", "esp32:esp32:esp32c3:CDCOnBoot=cdc,PartitionScheme=default")
    fqbn = fqbn.replace("PartitionScheme=default", "PartitionScheme=huge_app")
    command += ["compile", "--fqbn", fqbn,
                "--jobs", "2", "--warnings", "all", "--build-path", str(tmp_path / "build"),
                "--output-dir", str(artifacts / "output"), str(sketch)]
    (artifacts / "command.json").write_text(json.dumps(command, indent=2))
    environment = {key: value for key, value in os.environ.items() if not key.startswith("ARDUINO_")}
    with (artifacts / "compiler.stdout.log").open("wb") as stdout, (artifacts / "compiler.stderr.log").open("wb") as stderr:
        result = subprocess.run(command, env=environment, stdout=stdout, stderr=stderr, timeout=600)
    success = result.returncode == 0 and any((artifacts / "output").glob("*.bin")) and any((artifacts / "output").glob("*.elf"))
    (artifacts / "result.json").write_text(json.dumps({"variant": variant, "success": success, "returncode": result.returncode}))
    assert success, (artifacts / "compiler.stderr.log").read_text(encoding="utf-8", errors="replace")[-16000:]
