from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

from e2e.android.seed import assert_isolated, seed, verify
from plant_instances.models import PlantImage
from reminders.models import ReminderTask

pytestmark = pytest.mark.django_db


def test_fixtures_use_real_login_and_private_photo_and_are_not_reseeded():
    seed()
    client = APIClient()
    response = client.post('/auth/login/', {'email': 'navigation@example.test', 'password': 'E2e-only-password-2026'}, format='json')
    assert response.status_code == 200
    assert get_user_model().objects.count() == 2
    assert PlantImage.objects.count() == 2
    assert ReminderTask.objects.filter(status='pending').count() == 2
    with pytest.raises(RuntimeError, match='empty database'): seed()


def test_seed_rejects_production_settings_before_accessing_users(monkeypatch):
    monkeypatch.setenv('DJANGO_SETTINGS_MODULE', 'app.settings')
    with pytest.raises(RuntimeError, match='isolated E2E'): assert_isolated()
    assert not get_user_model().objects.exists()


def test_seed_rejects_external_database_and_mail():
    with override_settings(DATABASES={'default': {'ENGINE': 'django.db.backends.postgresql', 'HOST': 'production.invalid', 'NAME': 'application'}}):
        with pytest.raises(RuntimeError, match='disposable loopback'): assert_isolated()
    with override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend'):
        with pytest.raises(RuntimeError, match='SMTP'): assert_isolated()


def test_postconditions_require_completion_by_the_correct_native_account(tmp_path, monkeypatch):
    seed()
    monkeypatch.chdir(tmp_path); Path('e2e-results/android').mkdir(parents=True)
    with pytest.raises(AssertionError): verify()
    client = APIClient(); client.force_authenticate(get_user_model().objects.get(pk=502))
    assert client.post('/reminders/tasks/902/complete/', {}, format='json').status_code == 200
    verify()
    assert Path('e2e-results/android/backend-verification.json').is_file()
