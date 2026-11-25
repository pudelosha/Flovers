"""Explicit local, virgin-board-only programmer. Never called by CI or Django.

Every write requires operator confirmation and checksummed tool/image inputs.
Readback proves written bytes, not BLE interoperability, sensor calibration or relay safety.
"""
import base64
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import tempfile
import uuid

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from .materials import protected_directory
from .create_identity import write_private

NVS_OFFSET = 0x9000
NVS_SIZE = 0x5000


def checked_file(path, digest):
    path = Path(path)
    raw = path.read_bytes()
    if len(digest) != 64 or hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError("Tool or firmware checksum mismatch.")
    return raw


def validate_partition_table(image):
    if len(image) < 0x10000 or len(image) > 4 * 1024 * 1024:
        raise ValueError("Expected a complete merged ESP32-C3 factory image at offset zero.")
    partitions = []
    for pos in range(0x8000, 0x8C00, 32):
        magic, kind, subtype, offset, size, label, _ = struct.unpack("<HBBII16sI", image[pos:pos + 32])
        if magic == 0xFFFF or magic == 0xEBEB:
            break
        if magic != 0x50AA:
            raise ValueError("Invalid partition table.")
        partitions.append((kind, subtype, offset, size, label.rstrip(b"\0")))
    if (1, 2, NVS_OFFSET, NVS_SIZE, b"nvs") not in partitions:
        raise ValueError("Factory image NVS mapping is incompatible.")
    if not any(kind == 0 and subtype == 0 and offset == 0x10000 and size == 0x300000 for kind, subtype, offset, size, _ in partitions):
        raise ValueError("Universal firmware requires the huge_app 3 MB factory slot.")


def run_tool(args):
    # Never inherit diagnostic output that could contain manufacturing material.
    try:
        result = subprocess.run([str(a) for a in args], check=True, capture_output=True, timeout=180)
        return result.stdout.decode("utf-8", errors="replace")
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        raise ValueError("Factory tool failed or timed out; board must not be marked ready.") from None


def program_device(manifest, kit, *, hardware_id, confirm_hardware_id, port, new_board, firmware_variant,
        firmware, firmware_sha256, tool_python, esptool, esptool_sha256,
        nvs_generator, nvs_generator_sha256, output, runner=run_tool):
    if not new_board or hardware_id != confirm_hardware_id or not port:
        raise ValueError("Explicit new-board and hardware-ID confirmation required.")
    if firmware_variant != manifest["firmware_variant"]:
        raise ValueError("Approved firmware variant does not match this batch.")
    slot = next((d for d in manifest["devices"] if d["hardware_id"] == hardware_id), None)
    if not slot:
        raise ValueError("Device is not in this manufacturing kit.")
    image = checked_file(firmware, firmware_sha256)
    validate_partition_table(image)
    checked_file(esptool, esptool_sha256)
    checked_file(nvs_generator, nvs_generator_sha256)
    # The operator provides scripts from the checksum-pinned CI ESP32 3.3.12 toolchain.
    # No discovery of arbitrary PATH executables and no shell invocation.
    tool = [tool_python, esptool, "--chip", "esp32c3", "--port", port, "--baud", "460800", "--after", "no-reset"]
    output = protected_directory(output)
    work = protected_directory(output / "temporary-private")
    try:
        version = runner([tool_python, esptool, "version"])
        if not isinstance(version, str) or not re.search(r"(?<![\d.])5\.3\.1(?![\d.])", version):
            raise ValueError("Factory flashing requires pinned esptool 5.3.1.")
        csv_path = work / "factory.csv"
        write_private(csv_path, kit[hardware_id + "/factory-nvs.csv"].decode("utf-8"))
        nvs_path = work / "factory.bin"
        runner([tool_python, nvs_generator, "generate", csv_path, nvs_path, hex(NVS_SIZE)])
        nvs = nvs_path.read_bytes()
        if len(nvs) != NVS_SIZE:
            raise ValueError("Incorrect factory partition size.")
        before = work / "before.bin"
        runner(tool + ["read-flash", hex(NVS_OFFSET), hex(NVS_SIZE), before])
        if before.read_bytes() != b"\xff" * NVS_SIZE:
            raise ValueError("NVS is not blank. Refusing to overwrite an existing device or pump safety history.")
        runner(tool + ["write-flash", "0x0", firmware])
        runner(tool + ["write-flash", hex(NVS_OFFSET), nvs_path])
        after = work / "readback.bin"
        runner(tool + ["read-flash", "0x0", hex(len(image)), after])
        expected = bytearray(image)
        expected[NVS_OFFSET:NVS_OFFSET + NVS_SIZE] = nvs
        if after.read_bytes() != bytes(expected):
            raise ValueError("Flash readback mismatch; no verification receipt produced.")
        private = json.loads(kit[hardware_id + "/factory-private.json"])
        receipt = {"version": 1, "hardware_id": hardware_id, "serial_number": slot["serial_number"],
            "firmware_variant": manifest["firmware_variant"], "firmware_sha256": firmware_sha256,
            "factory_nvs_sha256": hashlib.sha256(nvs).hexdigest(), "readback_verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat(), "receipt_id": str(uuid.uuid4())}
        key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private["seed"]))
        canonical = json.dumps(receipt, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")
        receipt["signature"] = base64.b64encode(key.sign(canonical)).decode()
        write_private(output / "public-verification.json", json.dumps(receipt, indent=2))
        return receipt
    finally:
        # Best effort overwrite; SSD/COW storage requires encrypted station storage.
        for path in work.iterdir():
            if path.is_file() and not path.is_symlink():
                with path.open("r+b") as stream:
                    stream.write(b"\0" * path.stat().st_size)
                path.unlink()
        work.rmdir()
