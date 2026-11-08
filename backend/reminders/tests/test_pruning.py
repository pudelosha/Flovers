from datetime import timedelta
from io import BytesIO
from unittest.mock import patch
import json
from pathlib import Path

import pytest
from django.urls import reverse
from django.utils import timezone
from openpyxl import load_workbook

from profiles.progression import get_progression
from reminders.models import Reminder, ReminderTask
from reminders.tests.test_postpone import scene

pytestmark = pytest.mark.django_db


def as_pruning(scene):
    scene.reminder.type = 'pruning'
    scene.reminder.save(update_fields=['type'])


def test_pruning_can_be_created_manually_and_is_fourth_in_type_choices(scene):
    assert [key for key, _ in Reminder.TYPE_CHOICES] == ['water', 'moisture', 'fertilize', 'pruning', 'care', 'repot']
    response = scene.client.post(reverse('reminders-list-create'), {
        'plant': scene.plant.pk, 'type': 'pruning', 'start_date': timezone.localdate().isoformat(),
        'interval_value': 60, 'interval_unit': 'days',
    }, format='json')
    assert response.status_code == 201, response.data
    reminder = Reminder.objects.get(pk=response.data['id'])
    assert reminder.type == 'pruning' and reminder.tasks.filter(status='pending').count() == 1


def test_pruning_postponement_completion_history_xp_and_undo(scene):
    as_pruning(scene)
    original_due = scene.task.due_date
    postponed = scene.client.post(scene.url, {
        'expected_due_date': original_due.isoformat(),
        'due_date': (original_due + timedelta(days=2)).isoformat(),
    }, format='json')
    assert postponed.status_code == 200
    # Make the task due before completion, so normal XP eligibility applies.
    scene.task.due_date = original_due
    scene.task.save(update_fields=['due_date'])
    response = scene.client.post(reverse('reminder-task-complete', args=[scene.task.pk]), {'note': 'Trimmed shoots'}, format='json')
    assert response.status_code == 200, response.data
    scene.task.refresh_from_db()
    assert scene.task.completed_event['type'] == 'pruning'
    assert get_progression(scene.owner)['total_xp'] == 100
    child = scene.reminder.tasks.get(status='pending')
    assert child.due_date == original_due + timedelta(days=7)
    journal = scene.client.get(reverse('journal-feed'), {'types': 'pruning'})
    assert journal.status_code == 200, journal.data
    assert len(journal.data['results']) == 1
    assert journal.data['results'][0]['data']['type'] == 'pruning'
    undo = scene.client.post(reverse('reminder-task-undo-completion', args=[scene.task.pk]), {
        'expected_completion': scene.task.completion_undo['version'],
    }, format='json')
    assert undo.status_code == 200, undo.data
    assert get_progression(scene.owner)['total_xp'] == 0
    assert not ReminderTask.objects.filter(pk=child.pk).exists()
    scene.task.refresh_from_db()
    assert scene.task.status == 'pending'


def test_shared_pruning_preserves_completion_permissions_and_rewards_caregiver(scene):
    as_pruning(scene)
    scene.client.force_authenticate(scene.caregiver)
    scene.grant.can_complete_tasks = False
    scene.grant.save()
    url = reverse('reminder-task-complete', args=[scene.task.pk])
    assert scene.client.post(url, {}, format='json').status_code in (403, 404, 409)
    scene.grant.can_complete_tasks = True
    scene.grant.save()
    assert scene.client.post(url, {}, format='json').status_code == 200
    scene.task.refresh_from_db()
    assert scene.task.completed_by_id == scene.caregiver.pk
    assert get_progression(scene.caregiver)['total_xp'] == 100
    assert get_progression(scene.owner)['total_xp'] == 0


def test_pruning_export_and_bulk_delete_select_only_pruning(scene):
    as_pruning(scene)
    scene.task.mark_complete_and_spawn_next(actor=scene.owner)
    care = Reminder.objects.create(user=scene.owner, plant=scene.plant, type='care',
        start_date=timezone.localdate(), interval_value=30)
    care.ensure_one_pending_task()
    care.tasks.get().mark_complete_and_spawn_next(actor=scene.owner)
    with patch('reminders.views.send_templated_email') as send:
        response = scene.client.post(reverse('reminder-task-export-email'), {'types': ['pruning']}, format='json')
        assert response.status_code == 200, response.data
        attachment = send.call_args.kwargs['attachments'][0]
        workbook = load_workbook(BytesIO(attachment['content']))
        cells = [str(cell) for row in workbook.active.values for cell in row]
        assert 'Pruning' in cells and 'General care' not in cells
    response = scene.client.post(reverse('reminder-task-bulk-delete'), {'mode': 'types', 'types': ['pruning']}, format='json')
    assert response.status_code == 200, response.data
    assert not ReminderTask.objects.filter(pk=scene.task.pk).exists()
    assert care.tasks.filter(status='completed').exists()
    assert scene.reminder.tasks.filter(status='pending').exists()


def test_shared_care_message_has_pruning_label_in_every_backend_language():
    root = Path(__file__).resolve().parents[2] / 'i18n' / 'locales'
    for path in root.glob('*/email/sharing.task_completed.json'):
        data = json.loads(path.read_text(encoding='utf-8'))
        assert data['types']['pruning'].strip(), path
