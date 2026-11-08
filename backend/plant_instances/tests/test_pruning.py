import hashlib
import json
from datetime import timedelta

import pytest
from django.core.serializers.json import DjangoJSONEncoder
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from plant_instances.models import PlantInstance, PlantCreationRequest
from plant_instances.serializers import PlantInstanceSerializer
from plant_instances.tests.test_creation_idempotency import fixture
from plant_definitions.tests.test_models import _plant

pytestmark = pytest.mark.django_db


def test_auto_pruning_uses_explicit_choice_and_interval_not_definition_defaults():
    user, client, base = fixture()
    definition = _plant(pruning_required=True, pruning_interval_days=60)
    payload = {**base, 'plant_definition_id': definition.pk, 'pruning_required': True, 'pruning_interval_days': 45}
    response = client.post(reverse('plant-instance-list-create'), payload, format='json')
    assert response.status_code == 201, response.data
    plant = PlantInstance.objects.get(pk=response.data['id'])
    reminder = plant.reminders.get(type='pruning')
    assert reminder.interval_value == 45 and reminder.interval_unit == 'days'
    assert reminder.start_date == timezone.localdate() + timedelta(days=45)
    assert reminder.tasks.get().due_date == reminder.start_date
    assert plant.reminders.get(type='water').interval_value == 7
    retry = client.post(reverse('plant-instance-list-create'), payload, format='json')
    assert retry.status_code == 200 and retry.data == response.data
    assert plant.reminders.filter(type='pruning').count() == 1
    detail = client.get(reverse('plant-instance-detail', args=[plant.pk]))
    assert detail.data['pruning_required'] is True and detail.data['pruning_interval_days'] == 45


@pytest.mark.parametrize('create_auto_tasks,pruning_required', [(True, False), (False, True)])
def test_pruning_is_not_created_without_both_opt_ins(create_auto_tasks, pruning_required):
    _, client, base = fixture()
    definition = _plant(pruning_required=True, pruning_interval_days=60)
    response = client.post(reverse('plant-instance-list-create'), {
        **base, 'plant_definition_id': definition.pk, 'create_auto_tasks': create_auto_tasks,
        'pruning_required': pruning_required, 'pruning_interval_days': 60,
    }, format='json')
    assert response.status_code == 201, response.data
    assert not PlantInstance.objects.get().reminders.filter(type='pruning').exists()


@pytest.mark.parametrize('interval', [None, 0, -1, 32768])
def test_auto_pruning_requires_positive_bounded_interval(interval):
    _, client, base = fixture()
    response = client.post(reverse('plant-instance-list-create'), {
        **base, 'pruning_required': True, 'pruning_interval_days': interval,
    }, format='json')
    assert response.status_code == 400 and 'pruning_interval_days' in response.data
    assert not PlantInstance.objects.exists()


def test_old_creation_receipt_hash_survives_additive_fields():
    user, client, base = fixture()
    first = client.post(reverse('plant-instance-list-create'), base, format='json')
    assert first.status_code == 201
    request = APIRequestFactory().post('/', base, format='json')
    request.user = user
    serializer = PlantInstanceSerializer(data=base, context={'request': request})
    assert serializer.is_valid(), serializer.errors
    values = {k: v for k, v in serializer.validated_data.items() if k != 'creation_key'}
    prototype = PlantInstance(user=user, **values)
    legacy = {field.field_name: getattr(prototype, field.field_name)
              for field in serializer._writable_fields
              if field.field_name not in {'creation_key', 'pruning_required', 'pruning_interval_days'}}
    legacy_hash = hashlib.sha256(json.dumps(legacy, cls=DjangoJSONEncoder, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    receipt = PlantCreationRequest.objects.get(user=user)
    assert receipt.request_hash == legacy_hash
    response = client.post(reverse('plant-instance-list-create'), {
        **base, 'pruning_required': False, 'pruning_interval_days': None,
    }, format='json')
    assert response.status_code == 200 and response.data == first.data
    changed = client.post(reverse('plant-instance-list-create'), {
        **base, 'pruning_required': True, 'pruning_interval_days': 60,
    }, format='json')
    assert changed.status_code == 400
