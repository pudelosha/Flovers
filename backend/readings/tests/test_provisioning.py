"""Real DRF/model boundaries using synthetic factory identities only."""
import base64
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, connection, connections, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, DeviceCredential, DevicePairingSession, PhysicalDevice, PumpTask, Reading, ReadingDevice
from readings.provisioning import complete_pairing, config_digest, digest, proof_message

pytestmark = pytest.mark.django_db


@pytest.fixture
def setup():
    user = get_user_model().objects.create_user(email="owner@iot.test", password="synthetic-password")
    other = get_user_model().objects.create_user(email="other@iot.test", password="synthetic-password")
    location = Location.objects.create(user=user, name="Room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Synthetic plant")
    device = ReadingDevice.objects.create(user=user, plant=plant, device_name="Board", pump_included=True, pump_threshold_pct=30)
    private = Ed25519PrivateKey.generate()
    physical = PhysicalDevice.objects.create(hardware_id="FLOVERS_TEST_0001",
        bootstrap_public_key=base64.b64encode(private.public_key().public_bytes_raw()).decode(),
        provisioning_pop_digest=digest("synthetic-unique-proof-of-possession"),
        hardware_profile="esp32-c3-existing", hardware_revision="1")
    client = APIClient()
    client.force_authenticate(user)
    return user, other, device, physical, private, client


def start(setup, **changes):
    _, _, device, physical, _, client = setup
    return client.post(reverse("iot-pairing-start"), {"device_id": device.pk, "hardware_id": physical.hardware_id, **changes}, format="json")


def complete(setup, started=None, **changes):
    started = started if started is not None else start(setup)
    assert started.status_code == 201, started.data
    session = DevicePairingSession.objects.get(pk=started.data["session_id"])
    claim = started.data["claim"]
    signature = base64.b64encode(setup[4].sign(proof_message(session, claim))).decode()
    return APIClient().post(reverse("iot-pairing-complete"), {"session_id": str(session.pk), "claim": claim,
        "signature": signature, **changes}, format="json")


def hardware(token):
    client = APIClient()
    client.credentials(HTTP_X_FLOVERS_DEVICE_TOKEN=token)
    return client


def test_mobile_pairing_polling_has_separate_budget_from_creating_sessions(setup):
    from django.core.cache import cache
    cache.clear()
    begun = start(setup)
    assert begun.status_code == 201
    url = reverse("iot-pairing-status", args=[begun.data["session_id"]])
    for _ in range(40):
        assert setup[5].get(url).status_code == 200
    assert start(setup).status_code == 201
    cache.clear()


def test_pairing_requires_factory_signature_and_confirms_only_after_device_auth(setup):
    user, _, device, physical, _, owner = setup
    begun = start(setup)
    session = DevicePairingSession.objects.get(pk=begun.data["session_id"])
    assert base64.b64decode(begun.data["proof_payload"]) == proof_message(session, begun.data["claim"])
    assert DeviceCredential.objects.count() == 0
    bound = complete(setup, begun)
    assert bound.status_code == 201
    token = bound.data["device_token"]
    credential = DeviceCredential.objects.get()
    assert credential.token_digest == hashlib.sha256(token.encode()).hexdigest()
    assert token not in json.dumps(list(DeviceCredential.objects.values()), default=str)
    session_id = begun.data["session_id"]
    assert owner.get(reverse("iot-pairing-status", args=[session_id])).data["status"] == "bound"
    result = hardware(token).post(reverse("iot-configuration"), {}, format="json")
    assert result.status_code == 200
    assert result.data["configuration"]["automatic_watering"] is False
    assert result.data["configuration"]["offline_automatic_watering_allowed"] is False
    assert owner.get(reverse("iot-pairing-status", args=[session_id])).data["status"] == "confirmed"
    status = owner.get(reverse("iot-device-identity", args=[device.pk])).data
    assert status["synchronization"] == "pending"
    assert status["online"] is True
    assert not {"device_token", "bootstrap_public_key", "claim_digest", "provisioning_pop_digest"} & status.keys()


@pytest.mark.parametrize("failure", ["signature", "claim", "expired", "cancelled", "inactive-user", "disabled-hardware", "owner-changed"])
def test_invalid_pairing_does_not_bind_or_issue_credentials(setup, failure):
    begun = start(setup)
    session = DevicePairingSession.objects.get(pk=begun.data["session_id"])
    changes = {}
    if failure == "signature": changes["signature"] = base64.b64encode(bytes(64)).decode()
    if failure == "claim": changes["claim"] = "x" * 43
    if failure == "expired": session.expires_at = timezone.now() - timedelta(seconds=1); session.save()
    if failure == "cancelled": session.status = "cancelled"; session.save()
    if failure == "inactive-user": setup[0].is_active = False; setup[0].save()
    if failure == "disabled-hardware": setup[3].disabled = True; setup[3].save()
    if failure == "owner-changed": setup[2].user = setup[1]; setup[2].save()
    assert complete(setup, begun, **changes).status_code == 403
    assert not DeviceCredential.objects.exists()
    setup[3].refresh_from_db()
    assert setup[3].logical_device_id is None


def test_consumed_pairing_is_not_replayable(setup):
    begun = start(setup)
    assert complete(setup, begun).status_code == 201
    assert complete(setup, begun).status_code == 403
    assert DeviceCredential.objects.count() == 1


@pytest.mark.parametrize("duration", [1, 20, 300])
def test_factory_board_readings_pump_retry_restart_and_settings_round_trip(setup, duration):
    """Real HTTP/DB lifecycle; no physical relay or emulated flash claim."""
    token = complete(setup).data["device_token"]
    _, _, device, physical, _, owner = setup

    def apply(board):
        current = board.post(reverse("iot-configuration"), {}, format="json")
        assert current.status_code == 200
        body = current.data
        assert body["configuration"]["offline_automatic_watering_allowed"] is False
        ack = {"version": body["configuration"]["version"], "config_digest": body["config_digest"],
               "applied": True, "firmware_version": "synthetic-roundtrip-1"}
        assert board.post(reverse("iot-configuration-ack"), ack, format="json").status_code == 200

    board = hardware(token)
    assert board.post(reverse("pump-next-task"), {}, format="json").status_code == 409
    apply(board)
    timestamp = timezone.now().isoformat()
    payload = {"timestamp": timestamp, "metrics": {"temperature": 21.5, "humidity": None, "light": 0, "moisture": 0}}
    assert board.post(reverse("ingest"), payload, format="json").status_code == 202
    assert Reading.objects.get(device=device).moisture == 0
    assert board.post(reverse("pump-next-task"), {"supports_manual_duration": True}, format="json").status_code == 200
    scheduled = owner.post(reverse("reading-device-pump-schedule", args=[device.pk]), {"duration_seconds": duration}, format="json")
    assert scheduled.status_code == 201
    flags = {"supports_task_retry": True, "supports_manual_duration": True, "supports_auto_claim": True}
    first = board.post(reverse("pump-next-task"), flags, format="json")
    assert first.status_code == 200 and first.data["run"] is True
    assert first.data["duration_seconds"] == duration
    task_id = first.data["task_id"]
    device.refresh_from_db()
    boundary = device.pump_safety_until
    assert boundary > timezone.now()

    # A new HTTP client keeps the durable token and the same task reservation.
    restarted = hardware(token)
    retry = restarted.post(reverse("pump-next-task"), flags, format="json")
    assert retry.status_code == 200 and retry.data["task_id"] == task_id
    assert restarted.post(reverse("ingest"), payload, format="json").status_code == 202
    assert Reading.objects.filter(device=device).count() == 1
    completion = {"task_id": task_id, "source": "manual", "success": True}
    for _ in range(2):
        assert restarted.post(reverse("pump-complete"), completion, format="json").status_code == 200
    assert PumpTask.objects.get(pk=task_id).status == "executed"
    assert PumpTask.objects.filter(device=device).count() == 1
    device.refresh_from_db()
    assert device.pump_safety_until == boundary
    assert device.automatic_pump_launch is False

    old_version = device.desired_config_version
    assert owner.patch(reverse("reading-device-detail", args=[device.pk]), {"interval_minutes": 90}, format="json").status_code == 200
    assert restarted.post(reverse("pump-next-task"), flags, format="json").status_code == 409
    apply(restarted)
    device.refresh_from_db(); physical.refresh_from_db()
    assert device.desired_config_version == old_version + 1 == physical.applied_config_version
    assert device.pump_safety_until == boundary


def test_only_owner_can_start_poll_cancel_or_revoke(setup):
    _, other, device, _, _, client = setup
    begun = start(setup)
    client.force_authenticate(other)
    assert start(setup).status_code == 404
    for method in (client.get, client.delete):
        assert method(reverse("iot-pairing-status", args=[begun.data["session_id"]])).status_code == 404
        assert method(reverse("iot-device-identity", args=[device.pk])).status_code == 404
    assert APIClient().post(reverse("iot-pairing-start"), {}, format="json").status_code == 401


def test_new_session_cancels_old_and_owner_can_cancel(setup):
    first = start(setup)
    second = start(setup)
    assert complete(setup, first).status_code == 403
    result = setup[5].delete(reverse("iot-pairing-status", args=[second.data["session_id"]]))
    assert result.data["status"] == "cancelled"
    assert complete(setup, second).status_code == 403


def test_legacy_auth_remains_supported_but_no_downgrade_on_invalid_token(setup):
    user, _, device, _, _, _ = setup
    AccountSecret.objects.create(user=user, secret="legacy-synthetic-secret")
    payload = {"secret": "legacy-synthetic-secret", "device_key": device.device_key, "metrics": {"moisture": 45}}
    assert APIClient().post(reverse("ingest"), payload, format="json").status_code == 202
    for token in ("", "invalid", "x" * 64):
        assert APIClient().post(reverse("ingest"), {**payload, "device_token": token}, format="json").status_code == 403
    bound = complete(setup)
    assert APIClient().post(reverse("ingest"), payload, format="json").status_code == 403
    assert hardware(bound.data["device_token"]).post(reverse("ingest"), {"metrics": {"moisture": 50}}, format="json").status_code == 202


def test_device_token_cannot_address_another_logical_device(setup):
    token = complete(setup).data["device_token"]
    for changes in ({"device_id": setup[2].pk + 1}, {"device_key": "OTHER"}, {"device_token": "x" * 64}):
        response = hardware(token).post(reverse("ingest"), {"metrics": {"moisture": 50}, **changes}, format="json")
        assert response.status_code == 403
    assert hardware(token).get(reverse("feed"), {"device_token": token}).status_code == 400
    assert hardware(token).get(reverse("feed")).status_code == 200


def test_config_versions_acknowledgement_and_rejection(setup):
    token = complete(setup).data["device_token"]
    _, _, device, _, _, owner = setup
    board = hardware(token)
    fetched = board.post(reverse("iot-configuration"), {}, format="json").data
    ack = {"version": fetched["configuration"]["version"], "config_digest": fetched["config_digest"], "applied": True, "firmware_version": "1.0.0"}
    assert board.post(reverse("iot-configuration-ack"), ack, format="json").status_code == 200
    assert owner.get(reverse("iot-device-identity", args=[device.pk])).data["synchronization"] == "applied"
    assert owner.patch(reverse("reading-device-detail", args=[device.pk]), {"interval_minutes": 90}, format="json").status_code == 200
    device.refresh_from_db()
    assert device.desired_config_version == ack["version"] + 1
    assert owner.get(reverse("iot-device-identity", args=[device.pk])).data["synchronization"] == "pending"
    assert board.post(reverse("iot-configuration-ack"), ack, format="json").status_code == 409
    ack.update(version=device.desired_config_version, config_digest=config_digest(device), applied=False, error_code="storage_failed")
    assert board.post(reverse("iot-configuration-ack"), ack, format="json").status_code == 200
    assert owner.get(reverse("iot-device-identity", args=[device.pk])).data["synchronization"] == "rejected"
    ack["applied"] = True
    assert board.post(reverse("iot-configuration-ack"), ack, format="json").status_code == 200
    assert owner.patch(reverse("reading-device-detail", args=[device.pk]), {"device_name": "New name"}, format="json").status_code == 200
    device.refresh_from_db()
    assert device.desired_config_version == ack["version"]


def test_pump_requires_applied_config_and_backend_policy_still_applies(setup):
    token = complete(setup).data["device_token"]
    board = hardware(token)
    assert board.post(reverse("pump-next-task"), {}, format="json").status_code == 409
    assert board.post(reverse("pump-auto-claim"), {"moisture": 1}, format="json").status_code == 409
    current = board.post(reverse("iot-configuration"), {}, format="json").data
    ack = {"version": current["configuration"]["version"], "config_digest": current["config_digest"], "applied": True}
    assert board.post(reverse("iot-configuration-ack"), ack, format="json").status_code == 200
    assert board.post(reverse("pump-next-task"), {}, format="json").status_code == 200
    assert not PumpTask.objects.filter(source="automatic").exists()


def test_revocation_invalidates_token_cancels_tasks_preserves_history_and_cooldown(setup):
    token = complete(setup).data["device_token"]
    _, _, device, physical, _, owner = setup
    safety = timezone.now() + timedelta(hours=1)
    device.pump_safety_until = safety
    device.save(update_fields=["pump_safety_until"])
    task = PumpTask.objects.create(device=device)
    assert owner.delete(reverse("iot-device-identity", args=[device.pk])).status_code == 200
    assert hardware(token).post(reverse("iot-configuration"), {}, format="json").status_code == 403
    task.refresh_from_db(); device.refresh_from_db(); physical.refresh_from_db()
    assert task.status == "cancelled"
    assert device.pump_safety_until == safety
    assert device.automatic_pump_launch is False
    assert physical.logical_device_id is None
    assert complete(setup).status_code == 201  # Explicit re-pair is possible after revocation.


def test_replacement_requires_confirmation_and_revokes_old_binding(setup):
    old_token = complete(setup).data["device_token"]
    _, _, device, old, _, owner = setup
    new_private = Ed25519PrivateKey.generate()
    new = PhysicalDevice.objects.create(hardware_id="FLOVERS_TEST_0002", bootstrap_public_key=base64.b64encode(new_private.public_key().public_bytes_raw()).decode(),
        provisioning_pop_digest=digest("other-synthetic-pop"), hardware_profile="esp32-c3-existing", hardware_revision="1")
    second = (*setup[:3], new, new_private, owner)
    assert start(second).status_code == 409
    begun = start(second, replaces_hardware_id=old.hardware_id)
    task = PumpTask.objects.create(device=device, status="delivered")
    assert complete(second, begun).status_code == 201
    assert hardware(old_token).post(reverse("pump-next-task"), {}, format="json").status_code == 403
    old.refresh_from_db(); new.refresh_from_db(); task.refresh_from_db()
    assert old.logical_device_id is None
    assert new.logical_device_id == device.pk
    assert task.status == "cancelled"


def test_claim_conflict_does_not_rebind_hardware(setup):
    _, _, device, physical, _, owner = setup
    other_device = ReadingDevice.objects.create(user=device.user, plant=device.plant, device_name="Other")
    first = start(setup)
    owner.post(reverse("iot-pairing-start"), {"device_id": other_device.pk, "hardware_id": physical.hardware_id}, format="json")
    assert complete(setup, first).status_code == 201
    assert start(setup).status_code == 409
    assert DeviceCredential.objects.filter(revoked_at__isnull=True).count() == 1


def test_binding_failure_is_atomic(setup):
    begun = start(setup)
    with patch("readings.provisioning.DeviceCredential.objects.create", side_effect=RuntimeError("synthetic-failure")):
        with pytest.raises(RuntimeError):
            complete(setup, begun)
    setup[3].refresh_from_db()
    assert setup[3].logical_device_id is None
    assert DevicePairingSession.objects.get(pk=begun.data["session_id"]).status == "pending"


def test_disabled_device_can_receive_disable_config_but_cannot_ingest(setup):
    token = complete(setup).data["device_token"]
    device = setup[2]
    setup[5].patch(reverse("reading-device-detail", args=[device.pk]), {"is_active": False}, format="json")
    assert hardware(token).post(reverse("iot-configuration"), {}, format="json").data["configuration"]["enabled"] is False
    assert hardware(token).post(reverse("ingest"), {"metrics": {"moisture": 50}}, format="json").status_code == 403


def test_legacy_not_incorrectly_reported_unpaired_and_secrets_never_returned(setup):
    device, owner = setup[2], setup[5]
    assert owner.get(reverse("iot-device-identity", args=[device.pk])).data == {"pairing": "legacy-or-not-paired", "synchronization": "unknown"}
    assert APIClient().post(reverse("iot-configuration"), {}, format="json").status_code in {400, 403}


def test_factory_enrollment_validates_public_record_only(setup, tmp_path):
    private = Ed25519PrivateKey.generate()
    record = {"hardware_id": "FACTORY_TEST_0099", "bootstrap_public_key": base64.b64encode(private.public_key().public_bytes_raw()).decode(),
        "provisioning_pop_digest": digest("factory-pop-99"), "hardware_profile": "esp32-c3", "hardware_revision": "1"}
    file = tmp_path / "public.json"
    file.write_text(json.dumps(record))
    call_command("enroll_physical_device", str(file), stdout=StringIO())
    assert PhysicalDevice.objects.filter(hardware_id=record["hardware_id"]).exists()
    with pytest.raises(CommandError): call_command("enroll_physical_device", str(file), stdout=StringIO())
    record["private_key"] = "must-not-be-imported"
    file.write_text(json.dumps(record))
    with pytest.raises(CommandError): call_command("enroll_physical_device", str(file), stdout=StringIO())


def test_active_credential_uniqueness_is_database_enforced(setup):
    complete(setup)
    with pytest.raises(IntegrityError), transaction.atomic():
        DeviceCredential.objects.create(physical_device=setup[3], token_digest=digest("another-token"), binding_generation=1)


@pytest.mark.parametrize("payload", [
    {"interval_minutes": 0}, {"interval_minutes": 1441},
    {"pump_duration_seconds": 0}, {"pump_duration_seconds": 301},
    {"pump_cooldown_minutes": 0}, {"pump_cooldown_minutes": 32768},
    {"pump_threshold_pct": -1}, {"pump_threshold_pct": 101},
])
def test_invalid_runtime_configuration_does_not_advance_version(setup, payload):
    device, owner = setup[2], setup[5]
    version = device.desired_config_version
    assert owner.patch(reverse("reading-device-detail", args=[device.pk]), payload, format="json").status_code == 400
    device.refresh_from_db()
    assert device.desired_config_version == version


def test_auto_pump_and_legacy_aliases_advance_the_same_version(setup):
    device, owner = setup[2], setup[5]
    version = device.desired_config_version
    assert owner.patch(reverse("reading-device-detail", args=[device.pk]), {"intervalHours": 2}, format="json").status_code == 200
    device.refresh_from_db()
    assert device.desired_config_version == version + 1
    assert owner.patch(reverse("reading-device-auto-pump", args=[device.pk]), {"automatic_pump_launch": True, "pump_threshold_pct": 25}, format="json").status_code == 200
    device.refresh_from_db()
    assert device.desired_config_version == version + 2
    assert owner.patch(reverse("reading-device-auto-pump", args=[device.pk]), {"automatic_pump_launch": True, "pump_threshold_pct": 25}, format="json").status_code == 200
    device.refresh_from_db()
    assert device.desired_config_version == version + 2


def test_disabled_account_and_hardware_cannot_authenticate_existing_token(setup):
    token = complete(setup).data["device_token"]
    setup[3].disabled = True
    setup[3].save(update_fields=["disabled"])
    assert hardware(token).post(reverse("iot-configuration"), {}, format="json").status_code == 403
    setup[3].disabled = False
    setup[3].save(update_fields=["disabled"])
    setup[0].is_active = False
    setup[0].save(update_fields=["is_active"])
    assert hardware(token).post(reverse("iot-configuration"), {}, format="json").status_code == 403


@pytest.mark.django_db(transaction=True)
def test_competing_claims_have_exactly_one_winner(setup):
    """Threaded on PostgreSQL CI; SQLite covers the deterministic losing claim path."""
    user, _, device, physical, private, owner = setup
    other_device = ReadingDevice.objects.create(user=user, plant=device.plant, device_name="Competing logical record")
    first = start(setup)
    second = owner.post(reverse("iot-pairing-start"), {"device_id": other_device.pk, "hardware_id": physical.hardware_id}, format="json")
    arguments = []
    for begun in (first, second):
        assert begun.status_code == 201
        session = DevicePairingSession.objects.get(pk=begun.data["session_id"])
        arguments.append((session.pk, begun.data["claim"], base64.b64encode(private.sign(proof_message(session, begun.data["claim"]))).decode()))

    def claim(args):
        try:
            complete_pairing(*args)
            return "bound"
        except PermissionDenied:
            return "rejected"
        finally:
            if connection.vendor == "postgresql":
                connections.close_all()

    if connection.vendor == "postgresql":
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(claim, arguments))
    else:
        results = [claim(args) for args in arguments]
    assert sorted(results) == ["bound", "rejected"]
    assert DeviceCredential.objects.filter(revoked_at__isnull=True).count() == 1
    physical.refresh_from_db()
    assert physical.logical_device_id in {device.pk, other_device.pk}
