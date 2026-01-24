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
    Your settings.py uses BASE_DIR = Path(__file__).resolve().parent.parent
    located at backend/app/settings.py, so BASE_DIR == backend/
    """
    return Path(getattr(settings, "BASE_DIR", Path.cwd()))


def _locales_root() -> Path:
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
    Retrieve nested keys using dot notation, e.g. "accounts.activation.subject".
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
      - "profiles.due_today"
    """
    lang = _safe_lang(lang)
    rel = f"email/{scope}.json"
    path = _lang_file(lang, rel)
    return _load_json_file(str(path))


def t(key: str, *, lang: Optional[str] = None, default: Optional[str] = None) -> str:
    """
    Translation lookup:
      - looks in scope derived from key prefix
      - falls back to DEFAULT_LANG
      - returns default or the key if missing

    Key convention:
      - base.*                       -> email/base.json
      - accounts.activation.*        -> email/accounts.activation.json
      - profiles.due_today.*         -> email/profiles.due_today.json
    """
    lang = _safe_lang(lang)

    # Choose scope file based on first 1-2 segments.
    # Examples:
    #   "base.footer" -> scope "base"
    #   "accounts.activation.subject" -> scope "accounts.activation"
    #   "profiles.overdue_1d.subject" -> scope "profiles.overdue_1d"
    parts = key.split(".")
    if not parts:
        return default or key

    if parts[0] == "base":
        scope = "base"
        inner_key = ".".join(parts[1:])  # footer, brand, etc.
        lookup_key = inner_key
        data_lang = _load_scope(lang, scope)
        val = _deep_get(data_lang, lookup_key)

        if val is None:
            data_fallback = _load_scope(DEFAULT_LANG, scope)
            val = _deep_get(data_fallback, lookup_key)

    else:
        # Expect at least 3 parts: <group>.<name>.<field>
        # scope = "<group>.<name>"
        if len(parts) < 3:
            return default or key

        scope = f"{parts[0]}.{parts[1]}"
        lookup_key = ".".join(parts[2:])  # subject, title, etc.
        data_lang = _load_scope(lang, scope)
        val = _deep_get(data_lang, lookup_key)

        if val is None:
            data_fallback = _load_scope(DEFAULT_LANG, scope)
            val = _deep_get(data_fallback, lookup_key)

    if val is None:
        return default or key

    # Ensure string output for email content
    return str(val)


def merge_base(
    scope_ctx: dict[str, Any],
    *,
    lang: Optional[str] = None,
    extra_base: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Convenience to merge base email translations into a context dict.
    """
    lang = _safe_lang(lang)
    base = _load_scope(lang, "base")
    if not base:
        base = _load_scope(DEFAULT_LANG, "base")

    # base.json is a flat dict in this design, so just merge it.
    ctx = dict(base)
    if extra_base:
        ctx.update(extra_base)
    ctx.update(scope_ctx)
    return ctx
