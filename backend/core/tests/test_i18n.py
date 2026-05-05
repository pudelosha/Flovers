import json

from django.test import override_settings

from core import i18n


def _write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def test_i18n_translation_lookup_falls_back_to_english(tmp_path):
    _write_json(
        tmp_path / "i18n" / "locales" / "en" / "email" / "base.json",
        {"hello": "Hello"},
    )

    i18n._load_json_file.cache_clear()
    with override_settings(BASE_DIR=tmp_path):
        assert i18n.t("base.hello", lang="pl") == "Hello"
        assert i18n.t("base.missing", lang="pl", default="Fallback") == "Fallback"
    i18n._load_json_file.cache_clear()


def test_i18n_nested_lookup_and_formatting(tmp_path):
    _write_json(
        tmp_path / "i18n" / "locales" / "en" / "email" / "profiles.due_today.json",
        {"subject": "Tasks", "message": {"count": "You have {count} tasks"}},
    )

    i18n._load_json_file.cache_clear()
    with override_settings(BASE_DIR=tmp_path):
        assert i18n.t("profiles.due_today.subject", lang="en") == "Tasks"
        assert i18n.tf("profiles.due_today.message.count", lang="en", count=3) == (
            "You have 3 tasks"
        )
    i18n._load_json_file.cache_clear()


def test_i18n_merge_base_precedence(tmp_path):
    _write_json(
        tmp_path / "i18n" / "locales" / "en" / "email" / "base.json",
        {"app_name": "Base", "footer": "Footer"},
    )

    i18n._load_json_file.cache_clear()
    with override_settings(BASE_DIR=tmp_path):
        ctx = i18n.merge_base(
            {"app_name": "Scope"},
            lang="en",
            extra_base={"footer": "Extra"},
        )

    assert ctx["app_name"] == "Scope"
    assert ctx["footer"] == "Extra"
    i18n._load_json_file.cache_clear()
