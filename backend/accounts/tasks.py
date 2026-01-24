from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model

from core.emailing import send_templated_email
from .utils import build_activation_link, build_password_reset_link

User = get_user_model()


def _normalize_lang(lang: str | None) -> str:
    default = getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en"
    if not lang:
        return default
    lang = str(lang).strip().lower()
    supported = set(getattr(settings, "SUPPORTED_LANGS", [])) or {default}
    return lang if lang in supported else default


def _get_user_lang(user) -> str:
    default = getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en"
    try:
        ps = getattr(user, "profile_settings", None)
        if ps and getattr(ps, "language", None):
            return _normalize_lang(ps.language)
    except Exception:
        pass
    return default


@shared_task
def send_activation_email_task(user_id: int, lang: str | None = None):
    user = User.objects.get(pk=user_id)
    lang = _normalize_lang(lang) if lang else _get_user_lang(user)

    if not user.email:
        return

    activation_link = build_activation_link(user)

    send_templated_email(
        to_email=user.email,
        subject_key="accounts.activation.subject",
        template_name="accounts/activation",
        lang=lang,
        context={
            "user": user,
            "activation_link": activation_link,
        },
    )


@shared_task
def send_password_reset_email_task(user_id: int, lang: str | None = None):
    user = User.objects.get(pk=user_id)
    lang = _normalize_lang(lang) if lang else _get_user_lang(user)

    if not user.email:
        return

    reset_link = build_password_reset_link(user)

    send_templated_email(
        to_email=user.email,
        subject_key="accounts.password_reset.subject",
        template_name="accounts/password_reset",
        lang=lang,
        context={
            "user": user,
            "reset_link": reset_link,
        },
    )
