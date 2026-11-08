from datetime import timedelta
from unittest.mock import patch

import pytest
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from readings.codegen import generate_arduino_code
from readings.models import PumpTask
from readings.tests.test_stage3_integrity import device, credentials

pytestmark = pytest.mark.django_db


def client(device):
    result = APIClient()
    result.force_authenticate(device.user)
    return result


@pytest.mark.parametrize("seconds", [1, 20, 300])
def test_owner_can_save_and_reload_device_pump_duration(device, seconds):
    response = client(device).patch(reverse("reading-device-detail", args=[device.pk]),
        {"pump_duration_seconds": seconds}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["pump_duration_seconds"] == seconds
    device.refresh_from_db()
    assert device.pump_duration_seconds == seconds
    response = client(device).patch(reverse("reading-device-detail", args=[device.pk]), {"notes":"Keep duration"}, format="json")
    assert response.data["pump_duration_seconds"] == seconds


@pytest.mark.parametrize("seconds", [0, -1, 301, 20.5, True, None, "bad"])
def test_api_rejects_invalid_pump_durations_without_saving(device, seconds):
    response = client(device).patch(reverse("reading-device-detail", args=[device.pk]),
        {"pump_duration_seconds": seconds}, format="json")
    assert response.status_code == 400, response.data
    device.refresh_from_db()
    assert device.pump_duration_seconds == 20


def test_new_device_defaults_to_twenty_seconds(device):
    response = client(device).post(reverse("reading-device-list"),
        {"plant":device.plant_id,"device_name":"New board","sensors":{},"pump_included":True}, format="json")
    assert response.status_code == 201, response.data
    assert response.data["pump_duration_seconds"] == 20


@pytest.mark.parametrize("seconds", [1, 20, 300])
def test_codegen_uses_device_default_without_overriding_manual_jobs(seconds):
    code = generate_arduino_code(base_url="https://api.example.test", secret="test-only",
        device_id=1, device_key="TEST", pump_included=True, pump_duration_seconds=seconds)
    assert f"const unsigned long PUMP_RUN_MS = {seconds*1000}UL;" in code
    assert "runPumpForMs(PUMP_RUN_MS)" in code
    assert "duration_seconds" in code
    assert "String(PUMP_RUN_MS / 1000UL)" in code


@pytest.mark.parametrize("seconds", [0, -1, 301, True, None, 1.2, "20"])
def test_codegen_rejects_invalid_duration(seconds):
    with pytest.raises(ValueError):
        generate_arduino_code(base_url="https://api.example.test", secret="test-only", device_id=1,
            device_key="TEST", pump_included=True, pump_duration_seconds=seconds)


@override_settings(SITE_URL="https://api.example.test")
def test_download_and_email_both_embed_saved_duration(device):
    device.pump_duration_seconds = 45
    device.save(update_fields=["pump_duration_seconds"])
    api=client(device)
    response=api.post(reverse("reading-device-code-text",args=[device.pk]),{},format="json")
    assert response.status_code == 200, response.content
    assert b"const unsigned long PUMP_RUN_MS = 45000UL;" in response.content
    with patch("readings.views.send_device_code_email") as sender:
        response=api.post(reverse("reading-device-send-code-email",args=[device.pk]),{},format="json")
    assert response.status_code == 200, response.data
    assert "const unsigned long PUMP_RUN_MS = 45000UL;" in sender.call_args.kwargs["code_text"]


@pytest.mark.parametrize("seconds", [1, 20, 300])
def test_automatic_claim_reserves_actual_compiled_duration_even_after_settings_change(device, seconds):
    now=timezone.now()
    with patch("readings.views.timezone.now",return_value=now):
        response=APIClient().post(reverse("pump-auto-claim"),
            {**credentials(device),"moisture":10,"duration_seconds":seconds},format="json")
    assert response.status_code == 200 and response.data["run"] is True
    device.refresh_from_db()
    assert device.pump_safety_until == now+timedelta(minutes=device.pump_cooldown_minutes,seconds=seconds)
    # An automatic claim reports execution time, it does not create a manual-duration job.
    assert PumpTask.objects.get(device=device).duration_seconds is None


def test_legacy_automatic_firmware_still_gets_thirty_second_run_allowance(device):
    now=timezone.now()
    with patch("readings.views.timezone.now",return_value=now):
        response=APIClient().post(reverse("pump-auto-claim"),{**credentials(device),"moisture":10},format="json")
    assert response.data["run"] is True
    device.refresh_from_db()
    assert device.pump_safety_until == now+timedelta(minutes=device.pump_cooldown_minutes,seconds=30)


@pytest.mark.django_db(transaction=True)
def test_upgrade_preserves_old_thirty_seconds_and_new_devices_default_to_twenty():
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor
    before=[("readings","0009_reading_intervals_and_missing_alerts")]
    after=[("readings","0010_readingdevice_pump_duration_seconds")]
    executor=MigrationExecutor(connection)
    support_targets=[target for target in executor.loader.graph.leaf_nodes() if target[0] in {"accounts", "plant_instances", "plant_definitions"}]
    before+=support_targets
    after+=support_targets
    executor.migrate(before)
    try:
        old=executor.loader.project_state(before).apps
        user=old.get_model("accounts","User").objects.create(email="duration-upgrade@example.test",password="unusable")
        location=old.get_model("locations","Location").objects.create(user=user,name="Room",category="indoor")
        plant=old.get_model("plant_instances","PlantInstance").objects.create(user=user,location=location,display_name="Fern")
        device=old.get_model("readings","ReadingDevice").objects.create(user=user,plant=plant,device_key="OLDTIME",device_name="Legacy",pump_included=True)
        executor=MigrationExecutor(connection)
        executor.migrate(after)
        new=executor.loader.project_state(after).apps
        model=new.get_model("readings","ReadingDevice")
        assert model.objects.get(pk=device.pk).pump_duration_seconds==30
        fresh=model.objects.create(user_id=user.pk,plant_id=plant.pk,device_key="NEWTIME",device_name="New",pump_included=True)
        assert fresh.pump_duration_seconds==20
    finally:
        executor=MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())


def test_long_automatic_run_does_not_expire_while_the_pump_is_still_running(device):
    now=timezone.now()
    with patch("readings.views.timezone.now",return_value=now):
        claim=APIClient().post(reverse("pump-auto-claim"),
            {**credentials(device),"moisture":10,"duration_seconds":300},format="json")
    assert claim.data["run"] is True
    with patch("readings.views.timezone.now",return_value=now+timedelta(seconds=180)):
        client(device).get(reverse("reading-device-pump-status",args=[device.pk]))
    task=PumpTask.objects.get(pk=claim.data["task_id"])
    assert task.status==PumpTask.STATUS_DELIVERED
    with patch("readings.views.timezone.now",return_value=now+timedelta(seconds=300)):
        complete=APIClient().post(reverse("pump-complete"),
            {**credentials(device),"task_id":task.pk,"source":"automatic","success":True},format="json")
    assert complete.status_code==200,complete.data
    task.refresh_from_db()
    assert task.status==PumpTask.STATUS_EXECUTED
