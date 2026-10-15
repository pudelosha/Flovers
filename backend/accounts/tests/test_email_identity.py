from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.urls import reverse
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from accounts.serializers import ChangeEmailSerializer, RegisterSerializer

User = get_user_model()
pytestmark = pytest.mark.django_db


def test_model_and_manager_canonicalize_email_and_database_rejects_bypasses():
    user = User.objects.create_user(email="  TEST@Example.COM  ", password="safe-password-123")
    assert user.email == "test@example.com"
    user.email = "CHANGED@Example.COM"
    user.save(update_fields=["email"])
    user.refresh_from_db()
    assert user.email == "changed@example.com"
    with pytest.raises(IntegrityError), transaction.atomic():
        # bulk_create bypasses model.save; the functional DB constraint still protects identity.
        User.objects.bulk_create([User(email="CHANGED@example.com", password="unused")])


def test_two_validated_signups_cannot_create_case_variant_accounts():
    first = RegisterSerializer(data={"email": "Concurrent@example.com", "password": "safe-password-123"})
    second = RegisterSerializer(data={"email": "concurrent@example.com", "password": "safe-password-123"})
    assert first.is_valid(), first.errors
    assert second.is_valid(), second.errors
    first.save()
    with pytest.raises(ValidationError) as exc:
        second.save()
    assert "email" in exc.value.detail
    assert User.objects.filter(email__iexact="concurrent@example.com").count() == 1


def test_registration_view_returns_400_when_uniqueness_race_is_reported():
    with patch.object(RegisterSerializer, "save", side_effect=ValidationError({"email": ["Email is already taken."]})):
        response = APIClient().post(reverse("register"), {"email": "new@example.com", "password": "safe-password-123"}, format="json")
    assert response.status_code == 400
    assert "email" in response.json()["errors"]


def test_email_change_race_returns_400_and_preserves_previous_identity():
    user = User.objects.create_user(email="before@example.com", password="safe-password-123", is_active=True)
    original_validation = ChangeEmailSerializer.is_valid

    def validate_then_competing_commit(serializer, *args, **kwargs):
        valid = original_validation(serializer, *args, **kwargs)
        if valid:
            User.objects.create_user(email="claimed@example.com", password="safe-password-123")
        return valid

    client = APIClient()
    client.force_authenticate(user)
    with patch.object(ChangeEmailSerializer, "is_valid", validate_then_competing_commit):
        response = client.post(reverse("change-email"), {"new_email": "CLAIMED@example.com", "password": "safe-password-123"}, format="json")
    assert response.status_code == 400
    user.refresh_from_db()
    assert user.email == "before@example.com"


@pytest.mark.django_db(transaction=True)
def test_email_migration_refuses_collisions_without_merging_or_deleting_accounts():
    executor = MigrationExecutor(connection)
    final = executor.loader.graph.leaf_nodes()
    try:
        executor.migrate([("accounts", "0001_initial")])
        historical = executor.loader.project_state([("accounts", "0001_initial")]).apps.get_model("accounts", "User")
        first = historical.objects.create(email="Collision@example.com", password="unused")
        second = historical.objects.create(email="collision@example.com", password="unused")
        with pytest.raises(RuntimeError, match="Resolve their ownership"):
            MigrationExecutor(connection).migrate([("accounts", "0002_email_case_insensitive_identity")])
        assert list(historical.objects.order_by("pk").values_list("email", flat=True)) == ["Collision@example.com", "collision@example.com"]
        assert historical.objects.count() == 2
        historical.objects.filter(pk=second.pk).update(email="distinct@example.com")
        MigrationExecutor(connection).migrate(final)
        assert User.objects.get(pk=first.pk).email == "collision@example.com"
    finally:
        # Even a failed assertion leaves other test modules at the current schema.
        User.objects.filter(email="collision@example.com").delete()
        MigrationExecutor(connection).migrate(final)
