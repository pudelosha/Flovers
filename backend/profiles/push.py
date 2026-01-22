from __future__ import annotations

import os
from typing import Iterable

import firebase_admin
from firebase_admin import credentials, messaging


_app = None


def _get_firebase_app():
    global _app
    if _app is not None:
        return _app

    path = os.environ.get("FCM_SERVICE_ACCOUNT_PATH", "").strip()
    if not path:
        raise RuntimeError("FCM_SERVICE_ACCOUNT_PATH is not set")

    cred = credentials.Certificate(path)
    _app = firebase_admin.initialize_app(cred)
    return _app


def send_fcm_multicast(tokens: list[str], title: str, body: str, data: dict[str, str] | None = None):
    if not tokens:
        return None

    _get_firebase_app()

    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
    )
    return messaging.send_multicast(msg)
