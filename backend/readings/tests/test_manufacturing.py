"""Synthetic manufacturing only: never opens a serial port or contacts a service."""
import base64
from copy import deepcopy
import hashlib
from io import StringIO
import json
from pathlib import Path
import struct
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import RequestFactory
from django.db import connection, connections
from django.urls import reverse
from django.utils import timezone
from PIL import Image

from readings import manufacturing as m
from readings.admin import ManufacturingBatchAdmin, PhysicalDeviceAdmin
from readings.models import ManufacturingBatch, ManufacturingEvent, PhysicalDevice

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from firmware.factory.materials import generate_batch, create_vault, open_vault, validate_identity
from firmware.factory.labels import export_labels, layout
from firmware.factory.program import program_device, NVS_OFFSET, NVS_SIZE

pytestmark = pytest.mark.django_db


@pytest.fixture
def batch():
    return m.allocate_batch(code="SYNTHETIC-001", operation_id=uuid.uuid4(), count=2)


@pytest.fixture
def factory(batch, tmp_path):
    manifest = m.batch_manifest(batch)
    folder = generate_batch(manifest, tmp_path / "station")
    records = {str(f.relative_to(folder)).replace("\\", "/"): f.read_bytes()
               for f in folder.rglob("*") if f.is_file()}
    enrollment = json.loads((folder / "public-batch-enrollment.json").read_text())
    return manifest, folder, records, enrollment


def signed_receipt(device, kit):
    key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(json.loads(kit[device.hardware_id + "/factory-private.json"])["seed"]))
    receipt = {"version": 1, "hardware_id": device.hardware_id, "serial_number": device.serial_number,
        "firmware_variant": "sensors", "firmware_sha256": "a" * 64, "factory_nvs_sha256": "b" * 64,
        "readback_verified": True, "verified_at": timezone.now().isoformat(), "receipt_id": str(uuid.uuid4())}
    receipt["signature"] = base64.b64encode(key.sign(m.receipt_bytes(receipt))).decode()
    return receipt


def test_batch_is_unowned_public_and_idempotent(batch):
    devices = list(batch.devices.all())
    assert len({d.hardware_id for d in devices}) == 2
    assert len({d.serial_number for d in devices}) == 2
    assert all(d.logical_device_id is None and d.bootstrap_public_key is None and d.provisioning_pop_digest is None for d in devices)
    again = m.allocate_batch(code=batch.code, operation_id=batch.operation_id, count=2)
    assert again.pk == batch.pk
    assert ManufacturingEvent.objects.count() == 1
    with pytest.raises(ValidationError):
        m.allocate_batch(code=batch.code, operation_id=batch.operation_id, count=3)
    with pytest.raises(ValidationError):
        m.allocate_batch(code=batch.code, operation_id=uuid.uuid4(), count=2)
    assert PhysicalDevice.objects.count() == 2


@pytest.mark.parametrize("change", [{"count": 0}, {"count": 1001}, {"count": True}, {"hardware_profile": "random"}, {"firmware_variant": "unknown"}, {"code": "../bad"}])
def test_invalid_batches_create_nothing(change):
    options = dict(code="SYNTHETIC", count=1, operation_id=uuid.uuid4())
    with pytest.raises(ValidationError):
        m.allocate_batch(**(options | change))
    assert not ManufacturingBatch.objects.exists()


def test_public_enrollment_is_repeatable_and_never_rotates_identity(factory, batch):
    _manifest, _folder, kit, enrollment = factory
    m.enroll_batch(enrollment)
    keys = list(batch.devices.order_by("id").values_list("bootstrap_public_key", flat=True))
    events = ManufacturingEvent.objects.count()
    m.enroll_batch(enrollment)
    assert ManufacturingEvent.objects.count() == events
    assert list(batch.devices.order_by("id").values_list("bootstrap_public_key", flat=True)) == keys
    assert all(d.manufacturing_status == "registered" and d.logical_device_id is None for d in batch.devices.all())
    row = m.inventory_csv(batch.devices.all())
    for name, raw in kit.items():
        if name.endswith("factory-private.json"):
            private = json.loads(raw)
            assert private["seed"] not in row and private["pop"] not in row


@pytest.mark.parametrize("problem", ["private_key", "duplicate", "wrong_serial", "partial", "wrong_profile", "different_identity"])
def test_invalid_enrollment_is_atomic(factory, batch, problem):
    manifest = deepcopy(factory[3])
    if problem == "private_key":
        manifest["devices"][1]["seed"] = "do-not-log-this-secret"
    elif problem == "duplicate":
        manifest["devices"][1]["bootstrap_public_key"] = manifest["devices"][0]["bootstrap_public_key"]
    elif problem == "wrong_serial":
        manifest["devices"][1]["serial_number"] = "OTHER"
    elif problem == "partial":
        manifest["devices"].pop()
    elif problem == "wrong_profile":
        manifest["devices"][1]["hardware_profile"] = "other-board"
    else:
        m.enroll_batch(manifest)
        manifest["devices"][1]["bootstrap_public_key"] = base64.b64encode(Ed25519PrivateKey.generate().public_key().public_bytes_raw()).decode()
    before = list(batch.devices.order_by("id").values())
    with pytest.raises(ValidationError):
        m.enroll_batch(manifest)
    assert list(batch.devices.order_by("id").values()) == before


def test_lifecycle_requires_signed_matching_readback_receipt(factory, batch):
    m.enroll_batch(factory[3])
    d = batch.devices.first()
    with pytest.raises(ValidationError):
        m.set_status(d.hardware_id, "ready")
    receipt = signed_receipt(d, factory[2])
    corrupt = {**receipt, "readback_verified": False}
    with pytest.raises(ValidationError):
        m.record_verification(corrupt)
    wrong_key = {**receipt, "signature": base64.b64encode(b"x" * 64).decode()}
    with pytest.raises(ValidationError):
        m.record_verification(wrong_key)
    m.record_verification(receipt)
    m.record_verification(receipt)
    d.refresh_from_db()
    assert d.manufacturing_status == "verified" and d.verified_at and d.programmed_at
    assert d.manufacturing_events.filter(action="verified").count() == 1
    m.set_status(d.hardware_id, "ready")
    d.refresh_from_db()
    assert d.ready_at and not d.disabled
    m.set_status(d.hardware_id, "retired")
    d.refresh_from_db()
    assert d.disabled
    with pytest.raises(ValidationError):
        m.set_status(d.hardware_id, "ready")


def test_unverified_manufactured_board_cannot_start_pairing(factory, batch):
    from readings.provisioning import start_pairing, Conflict
    from locations.models import Location
    from plant_instances.models import PlantInstance
    from readings.models import ReadingDevice
    user = get_user_model().objects.create_user(email="synthetic@factory.test", password="test-password")
    location = Location.objects.create(user=user, name="Test", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Synthetic")
    device = ReadingDevice.objects.create(user=user, plant=plant)
    d = batch.devices.first()
    with pytest.raises(Conflict):
        start_pairing(user, device.pk, d.hardware_id)
    m.enroll_batch(factory[3])
    with pytest.raises(Conflict):
        start_pairing(user, device.pk, d.hardware_id)
    m.record_verification(signed_receipt(d, factory[2]))
    m.set_status(d.hardware_id, "ready")
    assert start_pairing(user, device.pk, d.hardware_id)


def test_admin_permissions_and_identity_immutability(batch, admin_client, client):
    from django.contrib import admin
    regular = get_user_model().objects.create_user(email="staff@factory.test", password="test-password", is_staff=True)
    request = RequestFactory().get("/"); request.user = regular
    inventory = PhysicalDeviceAdmin(PhysicalDevice, admin.site)
    assert not inventory.has_view_permission(request)
    with pytest.raises(PermissionDenied):
        m.set_status(batch.devices.first().hardware_id, "ready", actor=regular)
    regular.user_permissions.add(Permission.objects.get(codename="operate_manufacturing"))
    regular = get_user_model().objects.get(pk=regular.pk); request.user = regular
    assert inventory.has_view_permission(request)
    assert not inventory.has_add_permission(request) and not inventory.has_delete_permission(request)
    assert "bootstrap_public_key" not in inventory.fields
    assert set(inventory.fields) <= set(inventory.readonly_fields)
    client.force_login(regular)
    assert client.get(reverse("admin:readings_physicaldevice_changelist")).status_code == 200
    assert admin_client.get(reverse("admin:readings_manufacturing_import")).status_code == 200
    regular.user_permissions.clear()
    assert client.get(reverse("admin:readings_manufacturing_import")).status_code == 403


def test_commands_public_exports_filters_and_exclusive_paths(batch, tmp_path):
    out = tmp_path / "public.json"
    stdout = StringIO()
    call_command("manufacturing", "batch", "--batch", batch.code, "--operation-id", str(batch.operation_id),
        "--count", "2", "--output", str(out), stdout=stdout)
    assert json.loads(out.read_text())["batch"] == batch.code
    with pytest.raises(CommandError):
        call_command("manufacturing", "batch", "--batch", batch.code, "--operation-id", str(batch.operation_id),
            "--count", "2", "--output", str(out), stdout=stdout)
    assert batch.devices.count() == 2
    stdout = StringIO()
    call_command("manufacturing", "list", "--batch", batch.code, stdout=stdout)
    assert len(json.loads(stdout.getvalue())) == 2
    assert "bootstrap" not in stdout.getvalue() and "pop" not in stdout.getvalue()
    with pytest.raises(CommandError):
        call_command("manufacturing", "export", "--output", str(tmp_path / "missing" / "file.csv"))


def test_bad_upload_never_echoes_secret_or_creates_identity(tmp_path):
    file = tmp_path / "bad.json"; file.write_text('{"seed":"SECRET-NOT-FOR-LOGS"}')
    with pytest.raises(CommandError) as error:
        call_command("manufacturing", "enroll", "--input", str(file))
    assert "SECRET-NOT-FOR-LOGS" not in str(error.value)
    assert not PhysicalDevice.objects.exists()


def test_local_resume_preserves_keys_and_rejects_changed_manifest(factory, tmp_path):
    manifest, directory, kit, _ = factory
    generate_batch(manifest, directory, resume=True)
    assert all((directory / name).read_bytes() == raw for name, raw in kit.items())
    with pytest.raises(FileExistsError):
        generate_batch(manifest, directory)
    changed = deepcopy(manifest); changed["devices"][0]["serial_number"] += "X"
    with pytest.raises(ValueError):
        generate_batch(changed, directory, resume=True)


def test_vault_authenticates_decrypts_and_detects_corruption(factory, tmp_path):
    manifest, directory, kit, _ = factory
    vault = tmp_path / "batch.flv"
    phrase = "synthetic-passphrase-only-123"
    create_vault(directory, vault, phrase)
    for name, raw in kit.items():
        if name.endswith("factory-private.json"):
            assert json.loads(raw)["seed"].encode() not in vault.read_bytes()
    restored_manifest, restored = open_vault(vault, phrase)
    assert restored_manifest == manifest and restored == kit
    with pytest.raises(InvalidTag):
        open_vault(vault, "wrong-test-passphrase")
    data = json.loads(vault.read_text()); encrypted = bytearray(base64.b64decode(data["ciphertext"])); encrypted[-1] ^= 1
    data["ciphertext"] = base64.b64encode(encrypted).decode(); vault.write_text(json.dumps(data))
    with pytest.raises(InvalidTag):
        open_vault(vault, phrase)


@pytest.mark.parametrize("format", ["png", "svg", "pdf"])
def test_labels_reexport_same_identity_with_readable_format(factory, tmp_path, format):
    manifest, directory, kit, _ = factory
    before = {name: raw for name, raw in kit.items()}
    output = export_labels(manifest, kit, tmp_path / format, format=format)
    second = export_labels(manifest, kit, tmp_path / (format + "-again"), format=format)
    assert all((directory / name).read_bytes() == raw for name, raw in before.items())
    assert json.loads((output / "print-job.json").read_text())["devices"] == manifest["devices"]
    assert {f.name for f in output.iterdir()} == {f.name for f in second.iterdir()}
    if format == "pdf":
        raw = (output / "labels.pdf").read_bytes()
        assert raw.startswith(b"%PDF-") and b"/MediaBox" in raw
    elif format == "svg":
        import xml.etree.ElementTree as ET
        image = ET.parse(next(output.glob("*.svg")))
        assert image.getroot().attrib["width"] == "45mm"
        assert len(image.findall("{http://www.w3.org/2000/svg}rect")) > 100
    else:
        first = manifest["devices"][0]
        payload = json.dumps(json.loads(kit[first["hardware_id"] + "/device-qr.json"]), separators=(",", ":"))
        matrix, side = layout(payload, 45, 45)
        image = Image.open(output / (first["serial_number"] + ".png"))
        assert image.size == (531, 531)
        ppm = 300 / 25.4; module = int(side * ppm / len(matrix))
        left = (image.width - len(matrix) * module) // 2; top = round(37 * ppm) - len(matrix) * module
        for row, values in enumerate(matrix):
            for col, dark in enumerate(values):
                pixel = image.getpixel((left + col * module + module // 2, top + row * module + module // 2))
                assert pixel == ((0, 0, 0) if dark else (255, 255, 255))


def test_mismatched_label_nvs_and_too_small_prints_rejected(factory, tmp_path):
    manifest, directory, kit, _ = factory
    slot = manifest["devices"][0]; folder = directory / slot["hardware_id"]
    qr = json.loads((folder / "device-qr.json").read_text()); qr["pop"] = "X" * 43
    (folder / "device-qr.json").write_text(json.dumps(qr))
    with pytest.raises(ValueError):
        validate_identity(folder, slot, manifest)
    with pytest.raises(ValueError):
        export_labels(manifest, kit, tmp_path / "bad", width_mm=20)


def synthetic_image():
    image = bytearray(b"\xff" * (0x10000 + 512))
    entries = [(1, 2, NVS_OFFSET, NVS_SIZE, b"nvs"), (0, 0, 0x10000, 0x300000, b"app0")]
    for index, (kind, sub, offset, size, name) in enumerate(entries):
        image[0x8000 + index * 32:0x8020 + index * 32] = struct.pack("<HBBII16sI", 0x50AA, kind, sub, offset, size, name, 0)
    return bytes(image)


@pytest.mark.parametrize("failure", [None, "nonblank", "readback", "tool"])
def test_programming_receipt_only_after_confirmed_readback(factory, batch, tmp_path, failure):
    manifest, _directory, kit, enrollment = factory
    m.enroll_batch(enrollment)
    slot = manifest["devices"][0]
    image = synthetic_image(); firmware = tmp_path / "synthetic-image.bin"; firmware.write_bytes(image)
    tool = tmp_path / "synthetic-tool.py"; tool.write_text("# Synthetic; never executed\n")
    expected = bytearray(image); writes = []
    def fake_runner(args):
        args = [str(a) for a in args]
        if failure == "tool":
            raise ValueError("Synthetic tool failed")
        if args[-1] == "version":
            return "esptool v5.3.1"
        if "generate" in args:
            Path(args[-2]).write_bytes(b"N" * NVS_SIZE)
        elif "write-flash" in args:
            writes.append(args)
            if args[-2] == hex(NVS_OFFSET):
                expected[NVS_OFFSET:NVS_OFFSET + NVS_SIZE] = Path(args[-1]).read_bytes()
        elif "read-flash" in args:
            if args[-3] == hex(NVS_OFFSET):
                Path(args[-1]).write_bytes((b"x" if failure == "nonblank" else b"\xff") * NVS_SIZE)
            else:
                Path(args[-1]).write_bytes(b"broken" if failure == "readback" else expected)
    kwargs = dict(hardware_id=slot["hardware_id"], confirm_hardware_id=slot["hardware_id"], new_board=True,
        port="SYNTHETIC-NO-PORT", firmware_variant="sensors", firmware=firmware, firmware_sha256=hashlib.sha256(image).hexdigest(),
        tool_python="SYNTHETIC-PYTHON", esptool=tool, esptool_sha256=hashlib.sha256(tool.read_bytes()).hexdigest(),
        nvs_generator=tool, nvs_generator_sha256=hashlib.sha256(tool.read_bytes()).hexdigest(),
        output=tmp_path / "program", runner=fake_runner)
    if failure:
        with pytest.raises(ValueError):
            program_device(manifest, kit, **kwargs)
        assert not (kwargs["output"] / "public-verification.json").exists()
        if failure == "nonblank":
            assert not writes
    else:
        receipt = program_device(manifest, kit, **kwargs)
        assert len(writes) == 2
        assert all("no-reset" in args for args in writes)
        device = m.record_verification(receipt)
        assert device.manufacturing_status == "verified"
    assert not (kwargs["output"] / "temporary-private").exists()


def test_programming_without_explicit_confirmation_never_calls_tool(factory, tmp_path):
    from unittest.mock import Mock
    tool = Mock()
    with pytest.raises(ValueError):
        program_device(factory[0], factory[2], hardware_id="TEST_0001", confirm_hardware_id="WRONG", port="NONE", new_board=False,
            firmware_variant="sensors",
            firmware="not-read", firmware_sha256="", tool_python="", esptool="", esptool_sha256="", nvs_generator="",
            nvs_generator_sha256="", output=tmp_path / "unused", runner=tool)
    tool.assert_not_called()


@pytest.mark.django_db(transaction=True)
def test_competing_batch_requests_allocate_once():
    """Real concurrent transactions on PostgreSQL CI; deterministic retry on SQLite."""
    operation_id = uuid.uuid4()
    postgres = connection.vendor == "postgresql"
    def allocate(_):
        try:
            return m.allocate_batch(code="SYNTHETIC-RACE", operation_id=operation_id, count=2).pk
        finally:
            if postgres:
                connections.close_all()
    if postgres:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(allocate, range(2)))
    else:
        results = [allocate(i) for i in range(2)]
    assert results[0] == results[1]
    assert ManufacturingBatch.objects.count() == 1 and PhysicalDevice.objects.count() == 2
    assert ManufacturingEvent.objects.filter(action="batch_registered").count() == 1


@pytest.mark.django_db(transaction=True)
def test_manufactured_board_competing_claims_have_one_winner(factory, batch):
    """Exercise the new ready gate with actual signatures and competing claims."""
    from readings.provisioning import start_pairing, complete_pairing, proof_message
    from rest_framework.exceptions import PermissionDenied as PairingDenied
    from readings.models import ReadingDevice, DevicePairingSession, DeviceCredential
    from locations.models import Location
    from plant_instances.models import PlantInstance
    m.enroll_batch(factory[3]); d = batch.devices.first()
    m.record_verification(signed_receipt(d, factory[2])); m.set_status(d.hardware_id, "ready")
    user = get_user_model().objects.create_user(email="race@factory.test", password="synthetic-password")
    location = Location.objects.create(user=user, name="Room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Synthetic")
    private = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(json.loads(factory[2][d.hardware_id + "/factory-private.json"])["seed"]))
    claims = []
    for _ in range(2):
        device = ReadingDevice.objects.create(user=user, plant=plant)
        session, claim_secret = start_pairing(user, device.pk, d.hardware_id)
        signature = base64.b64encode(private.sign(proof_message(session, claim_secret))).decode()
        claims.append((session.pk, claim_secret, signature))
    postgres = connection.vendor == "postgresql"
    def claim(args):
        try:
            complete_pairing(*args)
            return "bound"
        except PairingDenied:
            return "rejected"
        finally:
            if postgres:
                connections.close_all()
    if postgres:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(claim, claims))
    else:
        results = [claim(args) for args in claims]
    assert sorted(results) == ["bound", "rejected"]
    assert DeviceCredential.objects.filter(revoked_at__isnull=True).count() == 1
