import secrets
import logging

from django.conf import settings
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.db import DatabaseError, transaction
from django.db.models import F
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
    action,
)
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.exceptions import APIException

from core.emailing import send_templated_email

from . import exports as reading_exports
from . import history as history_queries
from . import pump_service
from .models import ReadingDevice, Reading, AccountSecret, PumpTask
from .serializers import (
    ReadingDeviceSerializer,
    ReadingDeviceAutoPumpSerializer,
    ReadingIngestSerializer,
    ReadingSerializer,
    ReadingsExportEmailSerializer,
    PumpTaskSerializer,
    PumpScheduleSerializer,
)
from .device_auth import resolve_device, device_request_atomic
from .utils import parse_ts_or_now
from sharing.permissions import visible_plant_ids
from .throttles import (
    IngestPerDeviceThrottle,
    FeedPerDeviceThrottle,
    PumpPollPerDeviceThrottle,
    PumpCompletePerDeviceThrottle,
)
from .codegen import generate_arduino_code
from .emails import send_device_code_email
from .notifications import (
    send_moisture_alert_notifications,
)


# ---------- helpers ----------


logger = logging.getLogger(__name__)


def _get_or_create_secret(user) -> AccountSecret:
    obj, created = AccountSecret.objects.get_or_create(
        user=user,
        defaults={"secret": secrets.token_urlsafe(32)},
    )
    if created:
        obj.save(update_fields=["secret"])
    return obj


def _get_secret_str(user) -> str:
    return _get_or_create_secret(user).secret


def _normalize_lang(lang: str | None) -> str:
    default = getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en"
    if not lang:
        return default
    lang = str(lang).strip().lower()
    supported = set(getattr(settings, "SUPPORTED_LANGS", [])) or {default}
    return lang if lang in supported else default


def _request_lang(request) -> str:
    lang = request.data.get("lang") if hasattr(request, "data") else None
    return _normalize_lang(lang)


def _parse_bool(value, default=True) -> bool:
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y", "on"}

    return bool(value)


def _serialize_pump_task_for_app(task):
    if not task:
        return None

    data = PumpTaskSerializer(task).data

    data.pop("expires_at", None)

    return data


def _resolve_device_from_secret_and_key(request):
    try:
        return resolve_device(request), None
    except APIException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {"detail": exc.detail}
        return None, Response(detail, status=exc.status_code)


# ---- History helpers (for new /history/ endpoint) ----


# ---------- ViewSet: Devices CRUD ----------


class ReadingDeviceViewSet(viewsets.ModelViewSet):
    serializer_class = ReadingDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ReadingDevice.objects.filter(user_id=F("plant__user_id"))
        # Additional GET actions include firmware/account credentials and must
        # remain owner-only, just like every mutation and pump action.
        if self.action in {"list", "retrieve"}:
            return queryset.filter(
                plant_id__in=visible_plant_ids(self.request.user)
            ).select_related("plant__user")
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        self._lock_for_update = True
        return super().update(request, *args, **kwargs)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return (
            queryset.select_for_update()
            if getattr(self, "_lock_for_update", False)
            else queryset
        )

    @action(detail=True, methods=["patch"], url_path="auto-pump")
    @transaction.atomic
    def auto_pump(self, request, pk=None):
        self._lock_for_update = True
        device = self.get_object()
        serializer = ReadingDeviceAutoPumpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            pump_service.configure_automatic_watering(
                device,
                serializer.validated_data["automatic_pump_launch"],
                serializer.validated_data.get("pump_threshold_pct"),
            )
        except pump_service.PumpOperationError as error:
            return Response({"detail": str(error)}, status=400)
        return Response(
            ReadingDeviceSerializer(device, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], url_path="pump-status")
    def pump_status(self, request, pk=None):
        device = self.get_object()
        task = pump_service.get_open_manual_pump_task(device)

        return Response(
            {
                "pump_included": device.pump_included,
                "last_pump_run_at": device.last_pump_run_at,
                "last_pump_run_source": device.last_pump_run_source,
                "pending_pump_task": _serialize_pump_task_for_app(task),
                "supports_manual_duration": device.supports_manual_duration,
            }
        )

    @action(detail=True, methods=["post"], url_path="pump-schedule")
    def pump_schedule(self, request, pk=None):
        device = self.get_object()
        payload = PumpScheduleSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            task, created = pump_service.schedule_manual_watering(
                device, request.user, payload.validated_data.get("duration_seconds")
            )
        except pump_service.PumpOperationError as error:
            return Response({"detail": str(error)}, status=400)
        return Response(
            {
                "detail": (
                    "Watering scheduled."
                    if created
                    else "Watering is already scheduled."
                ),
                "pending_pump_task": _serialize_pump_task_for_app(task),
            },
            status=201 if created else 200,
        )

    @action(detail=True, methods=["post"], url_path="pump-recall")
    def pump_recall(self, request, pk=None):
        recalled = pump_service.recall_manual_watering(self.get_object(), request.user)
        return Response(
            {
                "detail": (
                    "Scheduled watering recalled."
                    if recalled
                    else "No pending watering request."
                ),
                "pending_pump_task": None,
            }
        )

    @action(detail=True, methods=["post"], url_path="code.txt")
    def code_text(self, request, pk=None):
        device = self.get_object()
        secret = _get_secret_str(request.user)
        base_url = getattr(settings, "SITE_URL", "http://127.0.0.1:8000")
        code = generate_arduino_code(
            base_url=base_url,
            secret=secret,
            device_id=device.id,
            device_key=device.device_key,
            sensors=device.sensors or {},
            pump_included=device.pump_included,
            automatic_pump_launch=device.automatic_pump_launch,
            pump_threshold_pct=device.pump_threshold_pct,
            pump_duration_seconds=device.pump_duration_seconds,
            interval_minutes=device.effective_interval_minutes,
            tls_ca_cert=getattr(settings, "IOT_TLS_CA_CERT", "") or None,
        )
        return HttpResponse(code, content_type="text/plain; charset=utf-8")

    @action(detail=True, methods=["post"], url_path="send-code-email")
    def send_code_email(self, request, pk=None):
        device = self.get_object()
        secret = _get_secret_str(request.user)
        base_url = getattr(settings, "SITE_URL", "http://127.0.0.1:8000")

        code = generate_arduino_code(
            base_url=base_url,
            secret=secret,
            device_id=device.id,
            device_key=device.device_key,
            sensors=device.sensors or {},
            pump_included=device.pump_included,
            automatic_pump_launch=device.automatic_pump_launch,
            pump_threshold_pct=device.pump_threshold_pct,
            pump_duration_seconds=device.pump_duration_seconds,
            interval_minutes=device.effective_interval_minutes,
            tls_ca_cert=getattr(settings, "IOT_TLS_CA_CERT", "") or None,
        )

        send_device_code_email(
            user=request.user,
            device=device,
            code_text=code,
        )

        return Response({"detail": f"Device code was sent to {request.user.email}."})

    @action(detail=True, methods=["get"], url_path="doc.pdf")
    def doc_pdf(self, request, pk=None):
        """Generates a minimal PDF; if ReportLab not installed returns 501."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from io import BytesIO
        except Exception:
            return Response(
                {"detail": "PDF generation requires reportlab. pip install reportlab"},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        device = self.get_object()
        secret = _get_secret_str(request.user)
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4
        y = h - 50
        lines = [
            "Flovers — Device Setup",
            "",
            f"Device: {device.device_name} (id={device.id})",
            f"Device key: {device.device_key}",
            f"Account secret: {secret}",
            "",
            "Endpoints:",
            f"  Ingest: {settings.SITE_URL}/readings/ingest/",
            f"  Feed:   {settings.SITE_URL}/readings/feed/",
            "",
            "Sample Ingest JSON:",
            '{ "secret": "SECRET", "device_id": ID, "device_key": "KEY", "metrics": { "temperature": 22.8 } }',
        ]
        for line in lines:
            c.drawString(40, y, line)
            y -= 18
        c.showPage()
        c.save()
        pdf = buf.getvalue()
        buf.close()
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = (
            f'attachment; filename="device-{device.id}-setup.pdf"'
        )
        return resp


# ---------- Account secret ----------


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def rotate_secret(request):
    rec = _get_or_create_secret(request.user)
    rec.secret = secrets.token_urlsafe(32)
    rec.rotated_at = timezone.now()
    rec.save(update_fields=["secret", "rotated_at"])
    return Response({"secret": rec.secret})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def device_setup(request):
    secret = _get_or_create_secret(request.user).secret
    base = getattr(settings, "SITE_URL", "")
    return Response(
        {
            "endpoints": {
                "ingest": f"{base}/readings/ingest/",
                "read": f"{base}/readings/feed/",
            },
            "sample_payloads": {
                "ingest": {
                    "secret": "ACCOUNT_SECRET",
                    "device_key": "AB12CD34",
                    "timestamp": "2025-10-31T13:45:00Z",
                    "metrics": {
                        "temperature": 22.8,
                        "humidity": 41.2,
                        "light": 771,
                        "moisture": 29,
                    },
                },
                "read": {
                    "secret": "ACCOUNT_SECRET",
                    "device_key": "AB12CD34",
                    "from": "2025-10-30T00:00:00Z",
                    "to": "2025-10-31T23:59:59Z",
                    "limit": 200,
                },
            },
            "secret": secret,
        }
    )


# ---------- Export readings by email ----------


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def readings_export_email(request):
    serializer = ReadingsExportEmailSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    to_email = (getattr(request.user, "email", "") or "").strip()
    if not to_email:
        return Response(
            {"detail": "Your account has no email address set."}, status=400
        )
    export = reading_exports.build_readings_export(
        request.user, serializer.validated_data
    )
    send_templated_email(
        to_email=to_email,
        template_name="readings/export",
        subject_key=None,
        context=export.context,
        lang=_request_lang(request),
        attachments=[
            {
                "filename": export.filename,
                "content": export.content,
                "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
        ],
    )
    return Response({"detail": "Readings export email sent."}, status=200)


# ---------- IoT endpoints (no JWT) ----------


@device_request_atomic
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, IngestPerDeviceThrottle])
def ingest(request):
    """
    Body:
    {
      "secret":"...","device_key":"AB12CD34",            # device_id optional
      "device_id":123,                                   # optional when device_key present
      "timestamp":"ISO-8601 optional",
      "metrics":{"temperature":22.8,"humidity":41.2,"light":771,"moisture":29}
    }

    Behavior:
      - Timestamps are rounded down to the full hour (e.g. 14:26 -> 14:00).
      - If a reading for (device, rounded_hour) exists, it is UPDATED instead of rejected.
      - Moisture alert state is updated based on threshold crossing.
      - When crossing into the low-moisture state, push and email notifications are sent once.
      - When moisture rises back above threshold, the active alert state is reset.
      - Pump task lookup is intentionally handled by /pump-next-task/.
      - Automatic watering requires a backend claim before the sketch drives the pump.
    """
    device, error_response = _resolve_device_from_secret_and_key(request)
    if error_response is not None:
        return error_response

    serializer = ReadingIngestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    metrics = serializer.validated_data["metrics"]
    ts = serializer.validated_data["timestamp"]
    ts_rounded = ts.replace(minute=0, second=0, microsecond=0)

    try:
        with transaction.atomic():
            should_send_moisture_alert = False
            alert_moisture_value = None

            device = ReadingDevice.objects.select_for_update().get(pk=device.pk)

            rec, created = Reading.objects.get_or_create(
                device=device,
                timestamp=ts_rounded,
                defaults={**metrics, "observed_at": ts},
            )

            # Retain an older hourly observation in history without allowing it
            # to replace a later observation already saved in that same bucket.
            if not created and rec.observed_at is not None and ts < rec.observed_at:
                return Response({"status": "ok"}, status=status.HTTP_202_ACCEPTED)
            if not created:
                for metric, value in metrics.items():
                    setattr(rec, metric, value)
                rec.observed_at = ts
                rec.save(update_fields=[*metrics, "observed_at"])

            if device.last_read_at is not None and ts < device.last_read_at:
                return Response({"status": "ok"}, status=status.HTTP_202_ACCEPTED)

            moisture_value = rec.moisture
            if (
                moisture_value is not None
                and "moisture" in metrics
                and device.moisture_alert_enabled
                and device.moisture_alert_threshold is not None
            ):
                try:
                    moisture_f = float(moisture_value)
                    threshold_f = float(device.moisture_alert_threshold)
                except (TypeError, ValueError):
                    moisture_f = None
                    threshold_f = None

                if moisture_f is not None and threshold_f is not None:
                    if moisture_f < threshold_f:
                        if not device.moisture_alert_active:
                            device.moisture_alert_active = True
                            should_send_moisture_alert = True
                            alert_moisture_value = moisture_f
                    else:
                        if device.moisture_alert_active:
                            device.moisture_alert_active = False
            elif device.moisture_alert_active and (
                not device.moisture_alert_enabled
                or device.moisture_alert_threshold is None
            ):
                device.moisture_alert_active = False

            device.last_read_at = ts
            device.latest_snapshot = {
                "temperature": rec.temperature,
                "humidity": rec.humidity,
                "light": rec.light,
                "moisture": rec.moisture,
            }
            device.save(
                update_fields=[
                    "last_read_at",
                    "latest_snapshot",
                    "moisture_alert_active",
                    "updated_at",
                ]
            )

            if should_send_moisture_alert and alert_moisture_value is not None:
                transaction.on_commit(
                    lambda device_id=device.id, moisture_value=alert_moisture_value: send_moisture_alert_notifications(
                        device_id=device_id,
                        moisture_value=moisture_value,
                    )
                )
    except DatabaseError:
        logger.exception("Reading write failed for device=%s", device.pk)
        return Response(
            {"detail": "Reading could not be saved. Please retry."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {"status": "ok"},
        status=status.HTTP_202_ACCEPTED,
    )


@device_request_atomic
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, PumpPollPerDeviceThrottle])
def pump_next_task(request):
    """
    Body:
    {
      "secret": "...",
      "device_key": "AB12CD34",
      "device_id": 123 optional
    }

    Used by Arduino/device after sending readings.

    Returns:
      - manual watering task info, if one is pending
      - current backend automatic pump config

    Arduino executes automatic watering only after the separate pump-auto-claim
    endpoint reserves a cooldown. Legacy automatic watering is disabled until
    the firmware advertises support for that protocol.
    """
    device, error = _resolve_device_from_secret_and_key(request)
    if error is not None:
        return error
    physical = getattr(request, "_authenticated_physical_device", None)
    if physical and (physical.applied_config_version != device.desired_config_version or physical.config_error):
        return Response({"detail": "Apply and acknowledge the current configuration before pump execution."}, status=409)
    return Response(
        pump_service.next_manual_task(
            device,
            supports_auto_claim=_parse_bool(
                request.data.get("supports_auto_claim"), default=False
            ),
            supports_task_retry=_parse_bool(
                request.data.get("supports_task_retry"), default=False
            ),
            supports_manual_duration=request.data.get("supports_manual_duration")
            is True,
        )
    )


@device_request_atomic
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, PumpCompletePerDeviceThrottle])
def pump_auto_claim(request):
    """Reserve a durable cooldown and one automatic execution before watering."""
    device, error = _resolve_device_from_secret_and_key(request)
    if error is not None:
        return error
    physical = getattr(request, "_authenticated_physical_device", None)
    if physical and (physical.applied_config_version != device.desired_config_version or physical.config_error):
        return Response({"detail": "Apply and acknowledge the current configuration before pump execution."}, status=409)
    duration = PumpScheduleSerializer(data=request.data)
    duration.is_valid(raise_exception=True)
    measurement = ReadingIngestSerializer(
        data={"metrics": {"moisture": request.data.get("moisture")}}
    )
    measurement.is_valid(raise_exception=True)
    moisture = measurement.validated_data["metrics"]["moisture"]
    if moisture is None:
        return Response({"detail": "A moisture measurement is required."}, status=400)
    return Response(
        pump_service.claim_automatic_watering(
            device, moisture, duration.validated_data.get("duration_seconds")
        )
    )


@device_request_atomic
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, PumpCompletePerDeviceThrottle])
def pump_complete(request):
    """
    Body for manual scheduled watering completion:
    {
      "secret": "...",
      "device_key": "AB12CD34",
      "task_id": 123,
      "source": "manual",
      "success": true,
      "error_message": "optional"
    }

    Body for claimed automatic watering completion (task-less reports from
    older firmware remain accepted as historical reports):
    {
      "secret": "...",
      "device_key": "AB12CD34",
      "task_id": 123,
      "source": "automatic",
      "success": true,
      "error_message": "optional"
    }

    This endpoint is intentionally unauthenticated by JWT, but validates device_key + account secret.
    """
    device, error = _resolve_device_from_secret_and_key(request)
    if error is not None:
        return error
    try:
        result = pump_service.complete_watering(
            device,
            task_id=request.data.get("task_id"),
            success=_parse_bool(request.data.get("success", True), default=True),
            error_message=request.data.get("error_message"),
            source=request.data.get("source") or PumpTask.SOURCE_MANUAL,
        )
    except PumpTask.DoesNotExist:
        raise Http404
    except pump_service.ClosedPumpTask as error:
        return Response({"detail": str(error)}, status=409)
    except pump_service.PumpOperationError as error:
        return Response({"detail": str(error)}, status=400)
    return Response(result)


@device_request_atomic
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, FeedPerDeviceThrottle])
def feed(request):
    """
    Query: ?secret=...&device_key=AB12CD34[&device_id=123][&from=ISO][&to=ISO]
    (device_id optional — device_key + secret is sufficient)

    Returns only the latest reading (as an array with at most one item).
    """
    device, error = _resolve_device_from_secret_and_key(request)
    if error is not None:
        return error

    qs = device.readings.all()
    if "from" in request.query_params:
        qs = qs.filter(timestamp__gte=request.query_params["from"])
    if "to" in request.query_params:
        qs = qs.filter(timestamp__lte=request.query_params["to"])

    latest = qs.order_by("-timestamp").first()
    if latest is None:
        readings_data = []
    else:
        readings_data = [ReadingSerializer(latest).data]

    return Response(
        {
            "device": {
                "id": device.id,
                "device_name": device.device_name,
                "plant_name": device.plant_name,
                "interval_hours": device.interval_hours,
                "interval_minutes": device.effective_interval_minutes,
            },
            "readings": readings_data,
        }
    )


# ---------- New: Authenticated history endpoint for charts ----------


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def summary_24h(request):
    try:
        device_id = int(request.query_params.get("device_id", ""))
        if device_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({"detail": "A positive device_id is required"}, status=400)
    device = get_object_or_404(
        ReadingDevice.objects.filter(
            user_id=F("plant__user_id"), plant_id__in=visible_plant_ids(request.user)
        ),
        pk=device_id,
    )
    return Response(history_queries.last_24_hours(device))


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def history(request):
    """
    Authenticated chart data for Readings History page.

    Query params:
      - device_id: required, ID of ReadingDevice belonging to current user
      - range: "day" | "week" | "month"  (default "day")
      - metric: "temperature" | "humidity" | "light" | "moisture" (default "temperature")
      - stat: "avg" | "max" | "min" for week/month daily buckets (default "avg")
      - anchor: ISO datetime for the anchor day (optional, defaults to now)

    Returns locale-neutral points:
      {
        "device": {...},
        "range": "day" | "week" | "month",
        "metric": "...",
        "unit": "°C" | "%" | "lx",
        "span": { "from": "...", "to": "..." },
        "points": [{ "at": string, "value": number | null, "sample_count": number }, ...]
      }

    `at` is the ISO datetime representing the start of the bucket.
    The frontend is responsible for formatting localized x-axis labels.
    """
    device_id = request.query_params.get("device_id")
    if not device_id:
        return Response({"detail": "device_id is required"}, status=400)

    try:
        device = ReadingDevice.objects.select_related("plant__user").get(
            id=device_id,
            user_id=F("plant__user_id"),
            plant_id__in=visible_plant_ids(request.user),
        )
    except ReadingDevice.DoesNotExist:
        raise Http404

    range_str = request.query_params.get("range", "day")
    if range_str not in history_queries.VALID_RANGES:
        return Response(
            {"detail": "range must be one of: day, week, month"}, status=400
        )

    metric = request.query_params.get("metric", "temperature")
    if metric not in history_queries.VALID_METRICS:
        return Response(
            {"detail": "metric must be one of: temperature, humidity, light, moisture"},
            status=400,
        )

    requested_stat = request.query_params.get("stat", "avg")
    if requested_stat not in history_queries.VALID_HISTORY_STATS:
        return Response({"detail": "stat must be one of: avg, max, min"}, status=400)

    return Response(
        history_queries.build_history_series(
            device,
            range_str=range_str,
            metric=metric,
            requested_stat=requested_stat,
            anchor=parse_ts_or_now(request.query_params.get("anchor")),
            user=request.user,
        )
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def history_delete_options(request):
    device_id = request.query_params.get("device_id")
    if not device_id:
        return Response({"detail": "device_id is required"}, status=400)

    try:
        device = ReadingDevice.objects.get(
            id=device_id, user=request.user, plant__user=request.user
        )
    except ReadingDevice.DoesNotExist:
        raise Http404

    return Response(history_queries.get_deletion_options(device))


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def history_bulk_delete(request):
    device_id = request.data.get("device_id")
    if not device_id:
        return Response({"detail": "device_id is required"}, status=400)

    try:
        device = ReadingDevice.objects.get(
            id=device_id, user=request.user, plant__user=request.user
        )
    except ReadingDevice.DoesNotExist:
        raise Http404

    try:
        result = history_queries.delete_history(device, request.user, request.data)
    except history_queries.HistoryValidationError as error:
        return Response({"detail": str(error)}, status=400)
    return Response(result)
