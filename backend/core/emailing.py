from __future__ import annotations

import logging
from typing import Any, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from django.utils.html import strip_tags

from .i18n import merge_base, t

logger = logging.getLogger(__name__)


def _render_template(path: str, context: dict[str, Any]) -> str:
    tpl = get_template(path)
    return tpl.render(context)


def _render_optional_template(path: str, context: dict[str, Any]) -> str:
    try:
        return _render_template(path, context)
    except Exception:
        logger.exception("Failed to render template: %s", path)
        return ""


def send_templated_email(
    *,
    to_email: str,
    subject_key: str,
    template_name: str,
    context: Optional[dict[str, Any]] = None,
    lang: Optional[str] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[list[str]] = None,
) -> bool:
    """
    Shared email service.

    template_name examples:
      - "accounts/activation"
      - "accounts/password_reset"
      - "profiles/due_today"
      - "profiles/overdue_1d"

    Renders:
      templates/email/<template_name>.html  (BODY fragment)
      templates/email/<template_name>.txt   (BODY fragment)
    Wraps with:
      templates/email/base.html
      templates/email/base.txt

    subject_key examples:
      - "accounts.activation.subject"
      - "accounts.password_reset.subject"
      - "profiles.due_today.subject"
      - "profiles.overdue_1d.subject"
    """
    if not to_email:
        return False

    lang = (lang or getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en").strip().lower()

    base_from = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@example.com"
    subject_prefix = getattr(settings, "EMAIL_SUBJECT_PREFIX", "") or ""

    ctx = merge_base(
        context or {},
        lang=lang,
        extra_base={
            "site_url": getattr(settings, "SITE_URL", ""),
            "public_web_base": getattr(settings, "PUBLIC_WEB_BASE", getattr(settings, "SITE_URL", "")),
            "app_name": getattr(settings, "APP_NAME", "Flovers"),
        },
    )

    subject = subject_prefix + t(subject_key, lang=lang, default="Flovers")

    # Body fragments
    body_html_fragment = _render_optional_template(f"email/{template_name}.html", ctx)
    body_txt_fragment = _render_optional_template(f"email/{template_name}.txt", ctx)

    # Wrap with base templates
    html = ""
    txt = ""

    if body_html_fragment:
        html = _render_optional_template("email/base.html", {**ctx, "content_html": body_html_fragment})

    if body_txt_fragment:
        txt = _render_optional_template("email/base.txt", {**ctx, "content_txt": body_txt_fragment})

    # Fallbacks
    if not txt and html:
        txt = strip_tags(html)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=txt or "",
        from_email=base_from,
        to=[to_email],
        reply_to=reply_to or None,
    )
    if html:
        msg.attach_alternative(html, "text/html")

    msg.send(fail_silently=False)
    return True
