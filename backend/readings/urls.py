from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReadingDeviceViewSet,
    rotate_secret,
    ingest,
    feed,
    device_setup,
    history,
)
from .views_open import open_readings

router = DefaultRouter()
router.register(r"devices", ReadingDeviceViewSet, basename="reading-device")

urlpatterns = [
    path("", include(router.urls)),
    path("rotate-secret/", rotate_secret, name="rotate-secret"),
    path("device-setup/", device_setup, name="device-setup"),
    path("ingest/", ingest, name="ingest"),
    path("feed/", feed, name="feed"),
    path("history/", history, name="history"),

    # App open / deep-link fallbacks
    path("open/readings/", open_readings, name="open-readings"),
]