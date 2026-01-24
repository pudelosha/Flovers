from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_LANG = "en"


def _backend_root() -> Path:
    """
    settings.BASE_DIR points to backend/ (per your app/settings.py).
    """
    return Path(getattr(settings, "BASE_DIR", Path.cwd()))


def _locales_root() -> Path:
    # Uses backend/i18n/locales/<lang>/email/*.json
    return _backend_root() / "i18n" / "locales"


def _safe_lang(lang: Optional[str]) -> str:
    if not lang:
        return DEFAULT_LANG
    lang = str(lang).strip().lower()
    # Accept "en-us" -> "en"
    if "-" in lang:
        lang = lang.split("-", 1)[0]
    return lang or DEFAULT_LANG


def _deep_get(d: Mapping[str, Any], key: str) -> Any:
    """
    Retrieve nested keys using dot notation, e.g. "a.b.c".
    (You mostly use flat JSON dicts, but this supports nesting too.)
    """
    cur: Any = d
    for part in key.split("."):
        if not isinstance(cur, Mapping) or part not in cur:
            return None
        cur = cur[part]
    return cur


@lru_cache(maxsize=512)
def _load_json_file(path: str) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Failed to load i18n JSON: %s", p)
        return {}


def _lang_file(lang: str, relative: str) -> Path:
    # relative like: "email/base.json" or "email/accounts.activation.json"
    return _locales_root() / lang / relative


def _load_scope(lang: str, scope: str) -> dict[str, Any]:
    """
    scope is a filename under <lang>/email/ without extension:
      - "base"
      - "accounts.activation"
      - "accounts.password_reset"
      - "profiles.due_today"
      - "profiles.overdue_1d"
    """
    lang = _safe_lang(lang)
    rel = f"email/{scope}.json"
    path = _lang_file(lang, rel)
    return _load_json_file(str(path))


def load_email_scope(scope: str, *, lang: Optional[str] = None) -> dict[str, Any]:
    """
    Load the entire dict for an email scope (one JSON file), with fallback to DEFAULT_LANG.
    """
    lang = _safe_lang(lang)
    data = _load_scope(lang, scope)
    if data:
        return data
    return _load_scope(DEFAULT_LANG, scope) or {}


def t(key: str, *, lang: Optional[str] = None, default: Optional[str] = None) -> str:
    """
    Translation lookup with JSON files.

    Key convention:
      - base.<field>                       -> email/base.json
      - accounts.activation.<field>        -> email/accounts.activation.json
      - accounts.password_reset.<field>    -> email/accounts.password_reset.json
      - profiles.due_today.<field>         -> email/profiles.due_today.json
      - profiles.overdue_1d.<field>        -> email/profiles.overdue_1d.json
    """
    lang = _safe_lang(lang)
    parts = key.split(".")
    if not parts:
        return default or key

    # base.*
    if parts[0] == "base":
        if len(parts) < 2:
            return default or key
        scope = "base"
        lookup_key = ".".join(parts[1:])
        data_lang = _load_scope(lang, scope)
        val = _deep_get(data_lang, lookup_key)

        if val is None:
            data_fallback = _load_scope(DEFAULT_LANG, scope)
            val = _deep_get(data_fallback, lookup_key)

    else:
        # <group>.<name>.<field...>
        if len(parts) < 3:
            return default or key
        scope = f"{parts[0]}.{parts[1]}"
        lookup_key = ".".join(parts[2:])
        data_lang = _load_scope(lang, scope)
        val = _deep_get(data_lang, lookup_key)

        if val is None:
            data_fallback = _load_scope(DEFAULT_LANG, scope)
            val = _deep_get(data_fallback, lookup_key)

    if val is None:
        return default or key

    return str(val)


def tf(key: str, *, lang: Optional[str] = None, default: Optional[str] = None, **kwargs: Any) -> str:
    """
    Translate + format with .format(**kwargs) for strings like:
      "You have {count} tasks..."
    If formatting fails, returns the untranslated string (best effort).
    """
    s = t(key, lang=lang, default=default)
    try:
        return s.format(**kwargs)
    except Exception:
        return s


def merge_base(
    scope_ctx: dict[str, Any],
    *,
    lang: Optional[str] = None,
    extra_base: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Merge base email translations (email/base.json) into a context dict.

    Precedence:
      base.json < extra_base < scope_ctx
    """
    lang = _safe_lang(lang)
    base = _load_scope(lang, "base") or _load_scope(DEFAULT_LANG, "base") or {}

    ctx: dict[str, Any] = dict(base)
    if extra_base:
        ctx.update(extra_base)
    ctx.update(scope_ctx)
    return ctx
