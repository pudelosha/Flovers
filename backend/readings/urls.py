from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReadingDeviceViewSet,
    rotate_secret,
    ingest,
    feed,
    device_setup,
    history,
    history_bulk_delete,
    history_delete_options,
    readings_export_email,
    pump_next_task,
    pump_complete,
    pump_auto_claim,
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
    path("history/delete-options/", history_delete_options, name="history-delete-options"),
    path("history/bulk-delete/", history_bulk_delete, name="history-bulk-delete"),
    path("export-email/", readings_export_email, name="readings-export-email"),
    path("pump-next-task/", pump_next_task, name="pump-next-task"),
    path("pump-complete/", pump_complete, name="pump-complete"),
    path("pump-auto-claim/", pump_auto_claim, name="pump-auto-claim"),

    # App open / deep-link fallbacks
    path("open/readings/", open_readings, name="open-readings"),
]
