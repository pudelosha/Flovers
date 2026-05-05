import json

import pytest
from django.core import mail
from django.test import override_settings

from core import i18n
from core.emailing import send_templated_email


def _write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_json(path, data):
    _write(path, json.dumps(data))


@pytest.mark.django_db
def test_send_templated_email_renders_templates_and_attachment(tmp_path):
    templates = tmp_path / "templates"
    locales = tmp_path / "i18n" / "locales" / "en" / "email"

    _write(templates / "email" / "base.html", "<html>{{ content_html }}</html>")
    _write(templates / "email" / "base.txt", "BASE {{ content_txt }}")
    _write(templates / "email" / "test" / "message.html", "<p>Hello {{ name }}</p>")
    _write(templates / "email" / "test" / "message.txt", "Hello {{ name }}")
    _write_json(locales / "base.json", {"footer": "Footer"})
    _write_json(locales / "test.message.json", {"subject": "Greetings"})

    i18n._load_json_file.cache_clear()
    with override_settings(
        BASE_DIR=tmp_path,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        EMAIL_SUBJECT_PREFIX="[Flovers]",
        DEFAULT_FROM_EMAIL="no-reply@example.com",
        TEMPLATES=[
            {
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "DIRS": [templates],
                "APP_DIRS": True,
                "OPTIONS": {"context_processors": []},
            }
        ],
    ):
        sent = send_templated_email(
            to_email="user@example.com",
            template_name="test/message",
            context={"name": "Ada"},
            attachments=[
                {
                    "filename": "report.txt",
                    "content": b"hello",
                    "mimetype": "text/plain",
                }
            ],
        )

    assert sent is True
    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.subject == "[Flovers] Greetings"
    assert message.body == "BASE Hello Ada"
    assert message.from_email == "no-reply@example.com"
    assert message.to == ["user@example.com"]
    assert message.attachments[0][0] == "report.txt"
    i18n._load_json_file.cache_clear()


def test_send_templated_email_returns_false_without_recipient():
    assert send_templated_email(to_email="", template_name="missing/template") is False
