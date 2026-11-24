"""Synthetic factory board at the HTTPS boundary; real DRF and Ed25519 verification.

This verifies the control-plane contract, not physical BLE, flash or pump actuation.
Never export the board credential: mobile receives only owner API responses.
"""
import base64
from datetime import timedelta

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.utils import timezone
from rest_framework.test import APIClient

from readings.models import DevicePairingSession, PhysicalDevice
from readings.provisioning import digest

HARDWARE_ID = "CONTRACT_BOARD_0001"


def factory(scene):
    # Publicly known test-only seed, never a production enrollment record.
    private = Ed25519PrivateKey.from_private_bytes(bytes(range(32)))
    PhysicalDevice.objects.create(hardware_id=HARDWARE_ID,
        bootstrap_public_key=base64.b64encode(private.public_key().public_bytes_raw()).decode(),
        provisioning_pop_digest=digest("synthetic-contract-pop"),
        hardware_profile="esp32-c3-existing", hardware_revision="1")
    scene.iot_private = private


def bind(scene, started):
    signature = base64.b64encode(scene.iot_private.sign(base64.b64decode(started["proof_payload"]))).decode()
    result = APIClient().post("/readings/pairing/complete/", {
        "session_id": started["session_id"], "claim": started["claim"], "signature": signature,
    }, format="json")
    assert result.status_code == 201, result.data
    board = APIClient()
    board.credentials(HTTP_X_FLOVERS_DEVICE_TOKEN=result.data["device_token"])
    scene.iot_board = board


def apply(scene, *, rejected=False):
    result = scene.iot_board.post("/readings/configuration/", {}, format="json")
    assert result.status_code == 200
    current = result.data
    assert current["configuration"]["offline_automatic_watering_allowed"] is False
    response = scene.iot_board.post("/readings/configuration/ack/", {
        "version": current["configuration"]["version"], "config_digest": current["config_digest"],
        "applied": not rejected, "firmware_version": "synthetic-universal-1",
        **({"error_code": "storage_failed"} if rejected else {}),
    }, format="json")
    assert response.status_code == 200, response.data


def prepare(scene, name, owner):
    factory(scene)
    if name == "iot-unbound":
        return
    started = owner.post("/readings/pairing/", {"device_id": scene.device.pk, "hardware_id": HARDWARE_ID}, format="json")
    assert started.status_code == 201, started.data
    scene.iot_session_id = str(started.data["session_id"])
    if name == "iot-expired":
        DevicePairingSession.objects.filter(pk=scene.iot_session_id).update(expires_at=timezone.now()-timedelta(seconds=1))
    elif name == "iot-cancelled":
        assert owner.delete(f"/readings/pairing/{scene.iot_session_id}/").status_code == 200
    elif name in {"iot-bound", "iot-confirmed", "iot-pending-config", "iot-rejected"}:
        bind(scene, started.data)
        if name != "iot-bound":
            apply(scene)
        if name in {"iot-pending-config", "iot-rejected"}:
            changed = owner.patch(f"/readings/devices/{scene.device.pk}/", {"interval_minutes": 90}, format="json")
            assert changed.status_code == 200
        if name == "iot-rejected":
            apply(scene, rejected=True)


def pairing_flow(scene, exchange):
    factory(scene)
    records = [exchange(scene, "owner", "GET", "/readings/devices/601/identity/")]
    started = exchange(scene, "owner", "POST", "/readings/pairing/", {"device_id": 601, "hardware_id": HARDWARE_ID})
    assert started["response"]["status"] == 201
    records.append(started)
    bind(scene, started["response"]["body"])
    path = f'/readings/pairing/{started["response"]["body"]["session_id"]}/'
    pending = exchange(scene, "owner", "GET", path)
    assert pending["response"]["body"]["status"] == "bound"
    assert pending["response"]["body"]["device"]["synchronization"] == "pending"
    records.append(pending)
    apply(scene)
    confirmed = exchange(scene, "owner", "GET", path)
    assert confirmed["response"]["body"]["status"] == "confirmed"
    assert confirmed["response"]["body"]["device"]["synchronization"] == "applied"
    records.append(confirmed)
    # Board-only credential must not cross the owner API boundary, including errors.
    assert all('"device_token"' not in record["canonical_response"] for record in records)
    return records
