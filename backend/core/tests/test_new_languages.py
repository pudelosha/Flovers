import pytest
from django.conf import settings

from core.i18n import load_email_scope, tf


@pytest.mark.parametrize("language", ["id", "ru", "tr"])
def test_new_languages_use_local_email_content_and_preserve_variables(language):
    assert language in settings.SUPPORTED_LANGS
    for scope in [
        "accounts.activation", "accounts.password_reset", "plant_instances.qr_code",
        "profiles.due_today", "profiles.overdue_1d", "profiles.support_copy",
        "readings.device_code", "readings.export", "readings.moisture_alert",
        "readings.watering_completed", "reminders.task_history_export",
    ]:
        local = load_email_scope(scope, lang=language)
        assert local["subject"]
        assert local["subject"] != load_email_scope(scope, lang="en")["subject"]
    message = tf("profiles.due_today.line1", lang=language, count=7)
    assert "7" in message and "{count}" not in message
    alert = tf("readings.moisture_alert.line1", lang=language,
               device_name="Blueberry", value=12, threshold=25)
    assert all(value in alert for value in ["Blueberry", "12", "25"])
