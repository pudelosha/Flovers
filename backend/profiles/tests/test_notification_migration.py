from datetime import date

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_existing_notification_logs_migrate_as_sent_not_pending_work():
    executor = MigrationExecutor(connection)
    final = executor.loader.graph.leaf_nodes()
    previous = [("profiles", "0012_profilesettings_japanese_korean")]
    previous += [target for target in final if target[0] == "accounts"]
    try:
        executor.migrate(previous)
        old = executor.loader.project_state(previous).apps
        User = old.get_model("accounts", "User")
        Delivery = old.get_model("profiles", "NotificationDeliveryLog")
        user = User.objects.create(email="delivery-migration@example.com", password="unused")
        sent = Delivery.objects.create(user_id=user.pk, channel="email", kind="due_today", local_date=date(2026, 10, 15))
        executor = MigrationExecutor(connection)
        executor.migrate(final)
        new = executor.loader.project_state(final).apps
        NewDelivery = new.get_model("profiles", "NotificationDeliveryLog")
        migrated = NewDelivery.objects.get(pk=sent.pk)
        assert migrated.status == "sent"
        assert migrated.sent_at == sent.created_at
        assert migrated.attempts == 0 and migrated.claim_token == ""
        assert migrated.lease_expires_at is None
    finally:
        MigrationExecutor(connection).migrate(final)
