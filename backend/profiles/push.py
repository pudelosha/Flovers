from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


import firebase_admin
from firebase_admin import credentials, messaging


_app = None


def _get_firebase_app():
    """
    Initialize Firebase Admin once (global singleton).
    Uses FCM_SERVICE_ACCOUNT_PATH env var.
    """
    global _app
    if _app is not None:
        return _app

    path = os.environ.get("FCM_SERVICE_ACCOUNT_PATH", "").strip()
    if not path:
        raise RuntimeError("FCM_SERVICE_ACCOUNT_PATH is not set")

    cred = credentials.Certificate(path)
    _app = firebase_admin.initialize_app(cred)
    return _app


@dataclass
class SendResponseLike:
    """
    Minimal compatibility wrapper that mimics firebase_admin.messaging.SendResponse enough
    for our code to inspect `.success` and `.exception`.
    """
    success: bool
    exception: Exception | None = None


@dataclass
class MulticastResultLike:
    """
    Minimal compatibility wrapper that mimics firebase_admin.messaging.BatchResponse enough
    for our code to inspect `.responses`, `.success_count`, `.failure_count`.
    """
    responses: list[SendResponseLike]
    success_count: int
    failure_count: int


def send_fcm_multicast(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> MulticastResultLike | Any:
    """
    Sends push notifications to multiple tokens.

    Works across Firebase Admin SDK versions:
    - Prefer messaging.send_each_for_multicast (newer SDKs)
    - Fallback to messaging.send (per-token) if multicast APIs aren't available

    Returns an object with:
    - .responses
    - .success_count
    - .failure_count
    """
    tokens = [t for t in tokens if t]
    if not tokens:
        return MulticastResultLike(responses=[], success_count=0, failure_count=0)

    _get_firebase_app()

    payload_data = data or {}

    # Newer SDK path
    if hasattr(messaging, "send_each_for_multicast"):
        msg = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title=title, body=body),
            data=payload_data,
        )
        resp = messaging.send_each_for_multicast(msg)
        # resp is a BatchResponse-like object:
        # resp.responses, resp.success_count, resp.failure_count
        return resp

    # Older SDK fallback: send one-by-one
    responses: list[SendResponseLike] = []
    success_count = 0
    failure_count = 0

    for t in tokens:
        msg = messaging.Message(
            token=t,
            notification=messaging.Notification(title=title, body=body),
            data=payload_data,
        )
        try:
            messaging.send(msg)
            success_count += 1
            responses.append(SendResponseLike(success=True, exception=None))
        except Exception as e:
            failure_count += 1
            responses.append(SendResponseLike(success=False, exception=e))

    return MulticastResultLike(
        responses=responses,
        success_count=success_count,
        failure_count=failure_count,
    )
