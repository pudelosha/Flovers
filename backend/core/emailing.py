from __future__ import annotations

import logging
from typing import Any, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from django.utils.html import strip_tags

from .i18n import load_email_scope, merge_base, t

logger = logging.getLogger(__name__)


def _render_template(path: str, context: dict[str, Any]) -> str:
    tpl = get_template(path)
    return tpl.render(context)


def _render_optional(path: str, context: dict[str, Any]) -> str:
    try:
        return _render_template(path, context)
    except Exception:
        logger.exception("Failed to render template: %s", path)
        return ""


def send_templated_email(
    *,
    to_email: str,
    template_name: str,
    subject_key: Optional[str] = None,
    context: Optional[dict[str, Any]] = None,
    lang: Optional[str] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[list[str]] = None,
) -> bool:
    """
    Renders:
      templates/email/<template_name>.html (fragment)
      templates/email/<template_name>.txt  (fragment)
    Wraps with:
      templates/email/base.html
      templates/email/base.txt

    template_name examples:
      - "accounts/activation"
      - "accounts/password_reset"
      - "profiles/due_today"
      - "profiles/overdue_1d"
    """
    if not to_email:
        return False

    lang = (lang or getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en").strip().lower()

    # Base context (base.json + global fields)
    base_ctx = merge_base(
        {},
        lang=lang,
        extra_base={
            "site_url": getattr(settings, "SITE_URL", ""),
            "public_web_base": getattr(settings, "PUBLIC_WEB_BASE", getattr(settings, "SITE_URL", "")),
            "app_name": getattr(settings, "APP_NAME", "Flovers"),
        },
    )

    # Scope context from JSON (accounts.activation, profiles.due_today, ...)
    scope = template_name.replace("/", ".")
    scope_ctx = load_email_scope(scope, lang=lang)

    # Caller context (highest precedence)
    caller_ctx = dict(context or {})

    # Convenience mapping: tasks often pass activation_link/reset_link, templates expect "link"
    if "link" not in caller_ctx:
        if "activation_link" in caller_ctx:
            caller_ctx["link"] = caller_ctx["activation_link"]
        elif "reset_link" in caller_ctx:
            caller_ctx["link"] = caller_ctx["reset_link"]

    # Final context:
    # base.json < scope.json < caller_ctx
    ctx: dict[str, Any] = {**base_ctx, **scope_ctx, **caller_ctx}

    # Subject (with optional prefix)
    # Priority:
    # 1) subject_key via t()
    # 2) scope JSON "subject"
    # 3) fallback "Flovers"
    subject: str = ""
    if subject_key:
        subject = t(subject_key, lang=lang, default="") or ""
    if not subject:
        subject = (scope_ctx.get("subject") or "").strip()
    if not subject:
        subject = "Flovers"

    prefix = (getattr(settings, "EMAIL_SUBJECT_PREFIX", "") or "")
    if prefix and not prefix.endswith(" "):
        prefix = prefix + " "
    subject = f"{prefix}{subject}"

    base_from = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@example.com"

    # Render fragments
    html_fragment = _render_optional(f"email/{template_name}.html", ctx)
    txt_fragment = _render_optional(f"email/{template_name}.txt", ctx)

    # Wrap with base templates
    html = ""
    txt = ""

    if html_fragment:
        html = _render_optional("email/base.html", {**ctx, "content_html": html_fragment})
    if txt_fragment:
        txt = _render_optional("email/base.txt", {**ctx, "content_txt": txt_fragment})

    # Fallbacks
    if not txt and html:
        txt = strip_tags(html)
    if not html and txt:
        html = ""

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
