"""
Make Celery optional for environments where Celery isn't installed
(e.g. local dev running only Django management commands).
"""

try:
    from .celery import celery_app  # noqa: F401
except ModuleNotFoundError:
    celery_app = None  # type: ignore
