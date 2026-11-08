import json
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command, CommandError
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient
from django.urls import reverse

from plant_definitions.models import PlantDefinition
from plant_definitions.management.commands.seed_plants import pruning_seed_defaults
from plant_definitions.tests.test_models import _plant


@pytest.mark.django_db
def test_pruning_defaults_and_profile_contract():
    definition = _plant()
    assert definition.pruning_required is False
    assert definition.pruning_interval_days is None
    client = APIClient()
    from django.contrib.auth import get_user_model
    client.force_authenticate(get_user_model().objects.create_user(email='definition-pruning@example.test'))
    response = client.get(reverse('plant-definitions-profile', args=[definition.pk]))
    assert response.status_code == 200
    assert response.data['pruning_required'] is False
    assert response.data['pruning_interval_days'] is None
    definition.pruning_required = True
    definition.pruning_interval_days = 60
    definition.save()
    response = client.get(reverse('plant-definitions-profile', args=[definition.pk]))
    assert response.data['pruning_required'] is True
    assert response.data['pruning_interval_days'] == 60


@pytest.mark.django_db
@pytest.mark.parametrize('required,interval', [(True, None), (True, 0), (False, 0), (True, 32768)])
def test_definition_rejects_invalid_pruning_intervals_in_models_and_database(required, interval):
    definition = _plant()
    definition.pruning_required, definition.pruning_interval_days = required, interval
    with pytest.raises(ValidationError):
        definition.full_clean()
    with transaction.atomic(), pytest.raises(IntegrityError):
        definition.save()


@pytest.mark.parametrize('payload', [
    {'pruning_required': 'false'}, {'pruning_required': True},
    {'pruning_interval_days': 0}, {'pruning_interval_days': -1},
    {'pruning_interval_days': 1.5}, {'pruning_interval_days': True},
    {'pruning_interval_days': 32768},
])
def test_seed_rejects_invalid_pruning_data(payload):
    with pytest.raises(CommandError):
        pruning_seed_defaults(payload)


@pytest.mark.django_db
def test_seed_import_preserves_unreviewed_guidance_and_never_creates_user_tasks(tmp_path):
    from locations.models import Location
    from plant_instances.models import PlantInstance
    from django.contrib.auth import get_user_model
    from reminders.models import Reminder
    definition = _plant(pruning_required=True, pruning_interval_days=90)
    user = get_user_model().objects.create_user(email='seed-pruning@example.test')
    location = Location.objects.create(user=user, name='Room')
    plant = PlantInstance.objects.create(user=user, location=location, plant_definition=definition)
    payload = {'external_id': definition.external_id, 'latin': definition.latin,
               'sun': 'medium', 'water': 'medium', 'difficulty': 'easy', 'traits': [], 'translations': {}}
    seed = tmp_path / 'pruning.json'

    def run(data):
        seed.write_text(json.dumps(data), encoding='utf-8')
        with patch('plant_definitions.management.commands.seed_plants._seed_dir', return_value=tmp_path):
            output = StringIO()
            call_command('seed_plants', stdout=output)
            assert 'Failed=0' in output.getvalue()
        definition.refresh_from_db()

    run(payload)  # Existing pre-pruning catalogue files do not erase reviewed guidance.
    assert (definition.pruning_required, definition.pruning_interval_days) == (True, 90)
    run({**payload, 'pruning_required': True, 'pruning_interval_days': 120})
    assert definition.pruning_interval_days == 120
    run({**payload, 'pruning_required': False, 'pruning_interval_days': None})
    assert definition.pruning_required is False and definition.pruning_interval_days is None
    plant.refresh_from_db()
    assert plant.pruning_required is False and plant.pruning_interval_days is None
    assert not Reminder.objects.filter(plant=plant).exists()
