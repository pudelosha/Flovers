import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_existing_accounts_receive_distinct_ids_without_changing_credentials():
    before = [("accounts", "0002_email_case_insensitive_identity")]
    after = [("accounts", "0003_user_flovers_id")]
    executor = MigrationExecutor(connection)
    executor.migrate(before)
    try:
        OldUser = executor.loader.project_state(before).apps.get_model("accounts", "User")
        first = OldUser.objects.create(email="existing-one@example.test", password="unchanged-hash", is_active=True)
        second = OldUser.objects.create(email="existing-two@example.test", password="other-hash", is_active=False)
        MigrationExecutor(connection).migrate(after)
        User = get_user_model()
        migrated = User.objects.get(pk=first.pk)
        other = User.objects.get(pk=second.pk)
        assert isinstance(migrated.flovers_id, uuid.UUID)
        assert migrated.flovers_id != other.flovers_id
        assert migrated.email == first.email
        assert migrated.password == "unchanged-hash"
        assert migrated.is_active is True
        assert other.password == "other-hash"
        assert other.is_active is False
        third = User.objects.create_user(email="new-account@example.test")
        assert len({migrated.flovers_id, other.flovers_id, third.flovers_id}) == 3
    finally:
        MigrationExecutor(connection).migrate(after)
