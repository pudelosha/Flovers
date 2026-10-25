from datetime import timedelta
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from readings.models import PumpTask
from readings.tests.test_stage3_integrity import device, credentials

pytestmark = pytest.mark.django_db


def app_client(device):
    client = APIClient()
    client.force_authenticate(device.user)
    return client


def schedule(device, payload):
    return app_client(device).post(reverse('reading-device-pump-schedule', args=[device.pk]), payload, format='json')


def poll(device, supported=True):
    return APIClient().post(reverse('pump-next-task'), {
        **credentials(device), 'supports_task_retry': True,
        'supports_auto_claim': True, 'supports_manual_duration': supported,
    }, format='json')


def test_manual_duration_round_trip_retry_and_cooldown(device):
    assert poll(device).status_code == 200
    response = schedule(device, {'duration_seconds': 120})
    assert response.status_code == 201
    task = PumpTask.objects.get(device=device)
    assert response.data['pending_pump_task']['duration_seconds'] == task.duration_seconds == 120
    assert schedule(device, {'duration_seconds': 20}).data['pending_pump_task']['duration_seconds'] == 120
    now = timezone.now()
    with patch('readings.views.timezone.now', return_value=now):
        delivered = poll(device)
    assert delivered.data['run'] is True
    assert delivered.data['duration_seconds'] == 120
    assert poll(device).data['task_id'] == task.pk
    device.refresh_from_db()
    assert device.pump_safety_until == now + timedelta(minutes=device.pump_cooldown_minutes, seconds=120)
    response = app_client(device).get(reverse('reading-device-pump-status', args=[device.pk]))
    assert response.data['supports_manual_duration'] is True
    assert response.data['pending_pump_task']['duration_seconds'] == 120


@pytest.mark.parametrize('value', [0, -1, 301, 20.5, True, None, 'abc'])
def test_invalid_duration_does_not_create_job(device, value):
    poll(device)
    assert schedule(device, {'duration_seconds': value}).status_code == 400
    assert not PumpTask.objects.filter(device=device).exists()


@pytest.mark.parametrize('seconds', [1, 20, 300])
def test_valid_duration_boundaries(device, seconds):
    poll(device)
    assert schedule(device, {'duration_seconds': seconds}).status_code == 201
    assert poll(device).data['duration_seconds'] == seconds


def test_model_migration_is_current():
    from django.core.management import call_command
    call_command('makemigrations', 'readings', check=True, dry_run=True, verbosity=0)


def test_old_firmware_cannot_accept_custom_duration(device):
    assert schedule(device, {'duration_seconds': 20}).status_code == 400
    poll(device)
    task_id = schedule(device, {'duration_seconds': 20}).data['pending_pump_task']['id']
    response = poll(device, supported=False)
    assert response.data['run'] is False
    assert response.data['reason'] == 'firmware_duration_update_required'
    assert PumpTask.objects.get(pk=task_id).status == PumpTask.STATUS_PENDING
    assert poll(device).data['duration_seconds'] == 20


def test_legacy_manual_and_automatic_jobs_keep_firmware_duration(device):
    assert schedule(device, {}).status_code == 201
    response = poll(device, supported=False)
    assert response.data['run'] is True
    assert response.data['duration_seconds'] is None
    PumpTask.objects.filter(device=device).delete()
    device.pump_safety_until = None
    device.save(update_fields=['pump_safety_until'])
    response = APIClient().post(reverse('pump-auto-claim'), {
        **credentials(device), 'moisture': 10, 'duration_seconds': 20,
    }, format='json')
    assert response.data['run'] is True
    assert 'duration_seconds' not in response.data
    assert PumpTask.objects.get(device=device).duration_seconds is None


def test_duration_capability_cannot_be_set_by_app_settings(device):
    response = app_client(device).patch(reverse('reading-device-detail', args=[device.pk]),
                                      {'supports_manual_duration': True}, format='json')
    assert response.status_code == 200
    device.refresh_from_db()
    assert device.supports_manual_duration is False
