from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReadingDeviceViewSet,
    rotate_secret,
    ingest,
    feed,
    device_setup,
    history,
    summary_24h,
    history_bulk_delete,
    history_delete_options,
    readings_export_email,
    pump_next_task,
    pump_complete,
    pump_auto_claim,
)
from .views_open import open_readings
from . import provisioning_views

router = DefaultRouter()
router.register(r"devices", ReadingDeviceViewSet, basename="reading-device")

urlpatterns = [
    path("pairing/", provisioning_views.pairing_start, name="iot-pairing-start"),
    path("pairing/complete/", provisioning_views.pairing_complete, name="iot-pairing-complete"),
    path("pairing/<uuid:session_id>/", provisioning_views.pairing_status, name="iot-pairing-status"),
    path("devices/<int:device_id>/identity/", provisioning_views.device_identity, name="iot-device-identity"),
    path("configuration/", provisioning_views.configuration, name="iot-configuration"),
    path("configuration/ack/", provisioning_views.configuration_ack, name="iot-configuration-ack"),
    path("", include(router.urls)),
    path("rotate-secret/", rotate_secret, name="rotate-secret"),
    path("device-setup/", device_setup, name="device-setup"),
    path("ingest/", ingest, name="ingest"),
    path("feed/", feed, name="feed"),
    path("history/", history, name="history"),
    path("summary-24h/", summary_24h, name="readings-summary-24h"),
    path("history/delete-options/", history_delete_options, name="history-delete-options"),
    path("history/bulk-delete/", history_bulk_delete, name="history-bulk-delete"),
    path("export-email/", readings_export_email, name="readings-export-email"),
    path("pump-next-task/", pump_next_task, name="pump-next-task"),
    path("pump-complete/", pump_complete, name="pump-complete"),
    path("pump-auto-claim/", pump_auto_claim, name="pump-auto-claim"),

    # App open / deep-link fallbacks
    path("open/readings/", open_readings, name="open-readings"),
]
