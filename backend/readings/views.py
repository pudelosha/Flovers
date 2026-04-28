from io import BytesIO
import math
import secrets
from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from core.emailing import send_templated_email

from .models import ReadingDevice, Reading, AccountSecret, PumpTask
from .serializers import (
    ReadingDeviceSerializer,
    ReadingDeviceAutoPumpSerializer,
    ReadingSerializer,
    ReadingsExportEmailSerializer,
    PumpTaskSerializer,
)
from .utils import parse_ts_or_now
from .throttles import IngestPerDeviceThrottle, FeedPerDeviceThrottle
from .codegen import generate_arduino_code
from .emails import send_device_code_email
from .notifications import (
    send_moisture_alert_notifications,
    send_watering_completed_notifications,
)


# ---------- helpers ----------

PUMP_TASK_TTL_HOURS = 2


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


def _format_dt_local(dt):
    if not dt:
        return ""
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M:%S")


def _bool_label(v: bool) -> str:
    return "Yes" if v else "No"


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

    # Keep expiry in the model/backend safety logic, but do not expose it to the app modal.
    data.pop("expires_at", None)

    return data


def _resolve_device_from_secret_and_key(request):
    device_id = request.data.get("device_id")
    device_key = request.data.get("device_key")
    secret_str = request.data.get("secret")

    if not (device_key and secret_str):
        return None, Response(
            {"detail": "device_key and secret are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    acct = AccountSecret.objects.select_related("user").filter(secret=secret_str).first()
    if not acct:
        return None, Response(
            {"detail": "invalid credentials"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if device_id:
        device = get_object_or_404(
            ReadingDevice,
            id=device_id,
            device_key=device_key,
            user=acct.user,
        )
    else:
        device = get_object_or_404(
            ReadingDevice,
            device_key=device_key,
            user=acct.user,
        )

    if not device.is_active:
        return None, Response(
            {"detail": "device disabled"},
            status=status.HTTP_403_FORBIDDEN,
        )

    return device, None


def _autosize_worksheet_columns(ws):
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                value = str(cell.value or "")
            except Exception:
                value = ""
            if len(value) > max_len:
                max_len = len(value)
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, 12), 42)


def _build_readings_export_workbook(readings, pump_tasks, sort_key: str, sort_dir: str) -> bytes:
    # lazy import so missing dependency would affect only this endpoint
    from openpyxl import Workbook
    from openpyxl.styles import Font

    reverse = sort_dir == "desc"

    # ============================== SHEET 1: READINGS ==============================

    reading_rows = []

    for reading in readings:
        device = reading.device

        reading_rows.append({
            "plant_name": device.plant_name or "",
            "location": device.plant_location or "",
            "device_name": device.device_name or "",
            "latest_temperature": reading.temperature,
            "latest_humidity": reading.humidity,
            "latest_light": reading.light,
            "latest_moisture": reading.moisture,
            "created_at": _format_dt_local(reading.timestamp),
            "_ts": reading.timestamp,
        })

    if sort_key == "name":
        reading_rows.sort(
            key=lambda r: (
                (r["plant_name"] or "").lower(),
                (r["device_name"] or "").lower(),
                r["_ts"],
            ),
            reverse=reverse,
        )
    elif sort_key == "location":
        reading_rows.sort(
            key=lambda r: (
                (r["location"] or "").lower(),
                (r["plant_name"] or "").lower(),
                (r["device_name"] or "").lower(),
                r["_ts"],
            ),
            reverse=reverse,
        )
    else:  # lastRead
        reading_rows.sort(
            key=lambda r: r["_ts"],
            reverse=reverse,
        )

    wb = Workbook()

    ws_readings = wb.active
    ws_readings.title = "Readings"

    readings_headers = [
        "Plant Name",
        "Location",
        "Device Name",
        "Temperature",
        "Humidity",
        "Light",
        "Soil Moisture",
        "Created At",
    ]
    ws_readings.append(readings_headers)

    for cell in ws_readings[1]:
        cell.font = Font(bold=True)

    for row in reading_rows:
        ws_readings.append([
            row["plant_name"],
            row["location"],
            row["device_name"],
            row["latest_temperature"],
            row["latest_humidity"],
            row["latest_light"],
            row["latest_moisture"],
            row["created_at"],
        ])

    _autosize_worksheet_columns(ws_readings)

    # ============================== SHEET 2: WATERING TASKS ==============================

    task_rows = []

    for task in pump_tasks:
        device = task.device

        task_rows.append({
            "plant_name": device.plant_name or "",
            "location": device.plant_location or "",
            "device_name": device.device_name or "",
            "source": task.source or "",
            "status": task.status or "",
            "requested_at": _format_dt_local(task.requested_at),
            "delivered_at": _format_dt_local(task.delivered_at),
            "executed_at": _format_dt_local(task.executed_at),
            "cancelled_at": _format_dt_local(task.cancelled_at),
            "moisture_at_request": task.moisture_at_request,
            "threshold_at_request": task.threshold_at_request,
            "error_message": task.error_message or "",
            "_ts": task.requested_at,
        })

    if sort_key == "name":
        task_rows.sort(
            key=lambda r: (
                (r["plant_name"] or "").lower(),
                (r["device_name"] or "").lower(),
                r["_ts"],
            ),
            reverse=reverse,
        )
    elif sort_key == "location":
        task_rows.sort(
            key=lambda r: (
                (r["location"] or "").lower(),
                (r["plant_name"] or "").lower(),
                (r["device_name"] or "").lower(),
                r["_ts"],
            ),
            reverse=reverse,
        )
    else:  # lastRead / task timestamp
        task_rows.sort(
            key=lambda r: r["_ts"],
            reverse=reverse,
        )

    ws_tasks = wb.create_sheet("Watering Tasks")

    tasks_headers = [
        "Plant Name",
        "Location",
        "Device Name",
        "Source",
        "Status",
        "Requested At",
        "Delivered At",
        "Executed At",
        "Cancelled At",
        "Moisture At Request",
        "Threshold At Request",
        "Error Message",
    ]
    ws_tasks.append(tasks_headers)

    for cell in ws_tasks[1]:
        cell.font = Font(bold=True)

    for row in task_rows:
        ws_tasks.append([
            row["plant_name"],
            row["location"],
            row["device_name"],
            row["source"],
            row["status"],
            row["requested_at"],
            row["delivered_at"],
            row["executed_at"],
            row["cancelled_at"],
            row["moisture_at_request"],
            row["threshold_at_request"],
            row["error_message"],
        ])

    _autosize_worksheet_columns(ws_tasks)

    stream = BytesIO()
    wb.save(stream)
    return stream.getvalue()


def _expire_old_pump_tasks(device: ReadingDevice):
    now = timezone.now()

    old_tasks = device.pump_tasks.filter(
        status__in=[PumpTask.STATUS_PENDING, PumpTask.STATUS_DELIVERED],
        expires_at__isnull=False,
        expires_at__lt=now,
    )

    old_tasks.update(status=PumpTask.STATUS_EXPIRED, updated_at=now)


def _get_open_manual_pump_task(device: ReadingDevice):
    _expire_old_pump_tasks(device)

    return (
        device.pump_tasks
        .filter(
            source=PumpTask.SOURCE_MANUAL,
            status__in=[PumpTask.STATUS_PENDING, PumpTask.STATUS_DELIVERED],
        )
        .order_by("-requested_at")
        .first()
    )


def _device_can_run_pump(device: ReadingDevice):
    if not device.pump_included:
        return False, "Pump is not included for this device."

    if not device.is_active:
        return False, "Device is disabled."

    return True, ""


def _auto_pump_config_for_device(device: ReadingDevice) -> dict:
    sensors = device.sensors or {}
    moisture_sensor_enabled = bool(sensors.get("moisture", True))

    return {
        "pump_included": bool(device.pump_included),
        "auto_pump_enabled": bool(
            device.pump_included
            and device.automatic_pump_launch
            and moisture_sensor_enabled
            and device.pump_threshold_pct is not None
            and device.is_active
        ),
        "auto_pump_threshold_pct": device.pump_threshold_pct,
        "moisture_sensor_enabled": moisture_sensor_enabled,
    }


# ---- History helpers (for new /history/ endpoint) ----

HISTORY_UNITS = {
    "temperature": "°C",
    "humidity": "%",
    "light": "lx",
    "moisture": "%",
}

VALID_METRICS = set(HISTORY_UNITS.keys())
VALID_RANGES = {"day", "week", "month"}


def _start_of_week_mon(dt: timezone.datetime) -> timezone.datetime:
    """
    Monday as the first day of the week.
    dt is assumed to be timezone-aware (local time).
    """
    day = dt.weekday()  # Monday=0..Sunday=6
    start = (dt - timedelta(days=day)).replace(hour=0, minute=0, second=0, microsecond=0)
    return start


def _end_of_week_sun(dt: timezone.datetime) -> timezone.datetime:
    start = _start_of_week_mon(dt)
    end = start + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)
    return end


def _first_of_month(dt: timezone.datetime) -> timezone.datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _month_day_count(dt: timezone.datetime) -> int:
    first = _first_of_month(dt)
    if first.month == 12:
        next_month = first.replace(year=first.year + 1, month=1)
    else:
        next_month = first.replace(month=first.month + 1)
    return (next_month.date() - first.date()).days


def _last_of_month(dt: timezone.datetime) -> timezone.datetime:
    first = _first_of_month(dt)
    if first.month == 12:
        next_month = first.replace(year=first.year + 1, month=1)
    else:
        next_month = first.replace(month=first.month + 1)
    last = next_month - timedelta(microseconds=1)
    return last


def _span_for(range_str: str, anchor_dt: timezone.datetime):
    """
    Returns (from, to) as timezone-aware datetimes in the current timezone.
    """
    if range_str == "day":
        s = anchor_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        e = anchor_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return s, e
    if range_str == "week":
        s = _start_of_week_mon(anchor_dt)
        e = _end_of_week_sun(anchor_dt)
        return s, e
    # month
    s = _first_of_month(anchor_dt)
    e = _last_of_month(anchor_dt)
    return s, e


def _weekday_short(dt: timezone.datetime) -> str:
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dt.weekday()]


# ---------- ViewSet: Devices CRUD ----------

class ReadingDeviceViewSet(viewsets.ModelViewSet):
    serializer_class = ReadingDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ReadingDevice.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["patch"], url_path="auto-pump")
    def auto_pump(self, request, pk=None):
        device = self.get_object()

        serializer = ReadingDeviceAutoPumpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        enabled = serializer.validated_data["automatic_pump_launch"]
        moisture_sensor_enabled = bool((device.sensors or {}).get("moisture", True))

        if enabled:
            if not device.pump_included:
                return Response(
                    {"detail": "Pump must be included to enable automatic pump launch."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not moisture_sensor_enabled:
                return Response(
                    {"detail": "Moisture sensor must be enabled to use automatic pump launch."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if device.pump_threshold_pct is None:
                return Response(
                    {"detail": "Pump threshold must be configured before enabling automatic pump launch."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        device.automatic_pump_launch = enabled
        device.save(update_fields=["automatic_pump_launch", "updated_at"])

        return Response(
            ReadingDeviceSerializer(device, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="pump-status")
    def pump_status(self, request, pk=None):
        device = self.get_object()
        task = _get_open_manual_pump_task(device)

        return Response({
            "pump_included": device.pump_included,
            "last_pump_run_at": device.last_pump_run_at,
            "last_pump_run_source": device.last_pump_run_source,
            "pending_pump_task": _serialize_pump_task_for_app(task),
        })

    @action(detail=True, methods=["post"], url_path="pump-schedule")
    def pump_schedule(self, request, pk=None):
        device = self.get_object()

        ok, reason = _device_can_run_pump(device)
        if not ok:
            return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            device = ReadingDevice.objects.select_for_update().get(pk=device.pk, user=request.user)
            existing = _get_open_manual_pump_task(device)

            if existing:
                return Response({
                    "detail": "Watering is already scheduled.",
                    "pending_pump_task": _serialize_pump_task_for_app(existing),
                }, status=status.HTTP_200_OK)

            now = timezone.now()
            task = PumpTask.objects.create(
                device=device,
                source=PumpTask.SOURCE_MANUAL,
                status=PumpTask.STATUS_PENDING,
                requested_at=now,
                expires_at=now + timedelta(hours=PUMP_TASK_TTL_HOURS),
                created_by_user=request.user,
            )

        return Response({
            "detail": "Watering scheduled.",
            "pending_pump_task": _serialize_pump_task_for_app(task),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="pump-recall")
    def pump_recall(self, request, pk=None):
        device = self.get_object()

        with transaction.atomic():
            device = ReadingDevice.objects.select_for_update().get(pk=device.pk, user=request.user)
            task = _get_open_manual_pump_task(device)

            if not task:
                return Response({
                    "detail": "No pending watering request.",
                    "pending_pump_task": None,
                }, status=status.HTTP_200_OK)

            now = timezone.now()
            task.status = PumpTask.STATUS_CANCELLED
            task.cancelled_at = now
            task.save(update_fields=["status", "cancelled_at", "updated_at"])

        return Response({
            "detail": "Scheduled watering recalled.",
            "pending_pump_task": None,
        }, status=status.HTTP_200_OK)

    # Optional convenience actions (auth)
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
        )

        send_device_code_email(
            user=request.user,
            device=device,
            code_text=code,
        )

        return Response({
            "detail": f"Device code was sent to {request.user.email}."
        })

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
            f"  Ingest: {settings.SITE_URL}/api/readings/ingest/",
            f"  Feed:   {settings.SITE_URL}/api/readings/feed/",
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
        resp["Content-Disposition"] = f'attachment; filename="device-{device.id}-setup.pdf"'
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
    return Response({
        "endpoints": {
            "ingest": f"{base}/api/readings/ingest/",
            "read": f"{base}/api/readings/feed/",
        },
        "sample_payloads": {
            "ingest": {
                "secret": "ACCOUNT_SECRET",
                # device_id is optional when device_key is provided
                # "device_id": 123,
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
                # "device_id": 123,  # optional
                "device_key": "AB12CD34",
                "from": "2025-10-30T00:00:00Z",
                "to": "2025-10-31T23:59:59Z",
                "limit": 200,
            },
        },
        "secret": secret,
    })


# ---------- Export readings by email ----------

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def readings_export_email(request):
    serializer = ReadingsExportEmailSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    to_email = (getattr(request.user, "email", "") or "").strip()
    if not to_email:
        return Response(
            {"detail": "Your account has no email address set."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    lang = _request_lang(request)

    plant_id = data.get("plantId")
    location = data.get("location")
    status_value = data.get("status")
    sort_key = data.get("sortKey", "name")
    sort_dir = data.get("sortDir", "asc")

    device_qs = (
        ReadingDevice.objects
        .filter(user=request.user)
        .select_related("plant")
    )

    if plant_id:
        device_qs = device_qs.filter(plant_id=plant_id)

    if location:
        device_qs = device_qs.filter(plant_location=location)

    if status_value == "enabled":
        device_qs = device_qs.filter(is_active=True)
    elif status_value == "disabled":
        device_qs = device_qs.filter(is_active=False)

    readings_qs = (
        Reading.objects
        .filter(device__in=device_qs)
        .select_related("device")
    )

    pump_tasks_qs = (
        PumpTask.objects
        .filter(device__in=device_qs)
        .select_related("device")
    )

    readings = list(readings_qs)
    pump_tasks = list(pump_tasks_qs)

    xlsx_bytes = _build_readings_export_workbook(
        readings=readings,
        pump_tasks=pump_tasks,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )

    now_label = timezone.localtime(timezone.now()).strftime("%Y%m%d-%H%M%S")
    attachment_filename = f"flovers-readings-{now_label}.xlsx"

    context = {
        "plant_value": str(plant_id) if plant_id else "Any plant",
        "location_value": location or "Any location",
        "status_value": status_value or "Any status",
        "sort_key_value": sort_key,
        "sort_dir_value": sort_dir,
        "total_count": len(readings),
        "watering_tasks_count": len(pump_tasks),
        "attachment_filename": attachment_filename,
    }

    send_templated_email(
        to_email=to_email,
        template_name="readings/export",
        subject_key=None,
        context=context,
        lang=lang,
        attachments=[
            {
                "filename": attachment_filename,
                "content": xlsx_bytes,
                "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
        ],
    )

    return Response(
        {"detail": "Readings export email sent."},
        status=status.HTTP_200_OK,
    )


# ---------- IoT endpoints (no JWT) ----------

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
      - Automatic pump decisions are handled by the Arduino sketch, not by the backend.
    """
    device, error_response = _resolve_device_from_secret_and_key(request)
    if error_response is not None:
        return error_response

    metrics = request.data.get("metrics") or {}

    # Original timestamp (for "last_read_at" / UX)
    ts = parse_ts_or_now(request.data.get("timestamp"))

    # Round timestamp down to full hour for storage in Reading.timestamp
    ts_rounded = ts.replace(minute=0, second=0, microsecond=0)

    try:
        with transaction.atomic():
            should_send_moisture_alert = False
            alert_moisture_value = None

            # Lock the device row while we update readings.
            device = ReadingDevice.objects.select_for_update().get(pk=device.pk)

            # Either create a new hourly record or update the existing one
            rec, created = Reading.objects.get_or_create(
                device=device,
                timestamp=ts_rounded,
                defaults=dict(
                    temperature=metrics.get("temperature"),
                    humidity=metrics.get("humidity"),
                    light=metrics.get("light"),
                    moisture=metrics.get("moisture"),
                ),
            )

            if not created:
                rec.temperature = metrics.get("temperature")
                rec.humidity = metrics.get("humidity")
                rec.light = metrics.get("light")
                rec.moisture = metrics.get("moisture")
                rec.save(update_fields=["temperature", "humidity", "light", "moisture"])

            # Update moisture alert state and schedule notification dispatch on threshold crossing
            moisture_value = rec.moisture
            if (
                moisture_value is not None
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
                not device.moisture_alert_enabled or device.moisture_alert_threshold is None
            ):
                device.moisture_alert_active = False

            # Update device's cached fields (last_read_at keeps the REAL timestamp)
            device.last_read_at = ts
            device.latest_snapshot = {
                "temperature": rec.temperature,
                "humidity": rec.humidity,
                "light": rec.light,
                "moisture": rec.moisture,
            }
            device.save(update_fields=[
                "last_read_at",
                "latest_snapshot",
                "moisture_alert_active",
                "updated_at",
            ])

            if should_send_moisture_alert and alert_moisture_value is not None:
                transaction.on_commit(
                    lambda device_id=device.id, moisture_value=alert_moisture_value: send_moisture_alert_notifications(
                        device_id=device_id,
                        moisture_value=moisture_value,
                    )
                )
    except IntegrityError:
        # Very unlikely with get_or_create, but keep behavior consistent / idempotent
        pass

    return Response(
        {"status": "ok"},
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, FeedPerDeviceThrottle])
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

    Automatic watering is still executed locally by Arduino, but only after
    backend confirms the current app-controlled auto-pump settings.
    """
    device, error_response = _resolve_device_from_secret_and_key(request)
    if error_response is not None:
        return error_response

    auto_config = _auto_pump_config_for_device(device)

    if not device.pump_included:
        return Response({
            "run": False,
            "task_id": None,
            "source": None,
            "reason": "pump_not_included",
            **auto_config,
        })

    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk)
        _expire_old_pump_tasks(device)

        auto_config = _auto_pump_config_for_device(device)

        task = (
            device.pump_tasks
            .select_for_update()
            .filter(
                source=PumpTask.SOURCE_MANUAL,
                status=PumpTask.STATUS_PENDING,
            )
            .order_by("requested_at")
            .first()
        )

        if not task:
            return Response({
                "run": False,
                "task_id": None,
                "source": None,
                "reason": None,
                **auto_config,
            })

        now = timezone.now()
        task.status = PumpTask.STATUS_DELIVERED
        task.delivered_at = now
        task.save(update_fields=["status", "delivered_at", "updated_at"])

    return Response({
        "run": True,
        "task_id": task.id,
        "source": PumpTask.SOURCE_MANUAL,
        "reason": "manual_scheduled",
        **auto_config,
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, FeedPerDeviceThrottle])
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

    Body for Arduino-local automatic watering completion:
    {
      "secret": "...",
      "device_key": "AB12CD34",
      "source": "automatic",
      "success": true,
      "error_message": "optional"
    }

    This endpoint is intentionally unauthenticated by JWT, but validates device_key + account secret.
    """
    device, error_response = _resolve_device_from_secret_and_key(request)
    if error_response is not None:
        return error_response

    task_id = request.data.get("task_id")
    success = _parse_bool(request.data.get("success", True), default=True)
    error_message = request.data.get("error_message")
    source = request.data.get("source") or PumpTask.SOURCE_MANUAL

    if source not in {PumpTask.SOURCE_MANUAL, PumpTask.SOURCE_AUTOMATIC}:
        source = PumpTask.SOURCE_MANUAL

    if not device.pump_included:
        return Response(
            {"detail": "Pump is not included for this device."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()

    with transaction.atomic():
        device = ReadingDevice.objects.select_for_update().get(pk=device.pk)

        if task_id:
            task = get_object_or_404(PumpTask, id=task_id, device=device)
            task = PumpTask.objects.select_for_update().get(id=task.id)

            # Idempotent success for repeated Arduino retries
            if task.status == PumpTask.STATUS_EXECUTED:
                return Response({
                    "detail": "Pump execution was already recorded.",
                    "last_pump_run_at": device.last_pump_run_at,
                    "last_pump_run_source": device.last_pump_run_source,
                })

            if task.status in [PumpTask.STATUS_CANCELLED, PumpTask.STATUS_EXPIRED]:
                return Response(
                    {"detail": f"Task is already {task.status}."},
                    status=status.HTTP_409_CONFLICT,
                )

            if success:
                task.status = PumpTask.STATUS_EXECUTED
                task.executed_at = now
                task.error_message = None

                device.last_pump_run_at = now
                device.last_pump_run_source = task.source
                device.save(update_fields=[
                    "last_pump_run_at",
                    "last_pump_run_source",
                    "updated_at",
                ])

                task.save(update_fields=[
                    "status",
                    "executed_at",
                    "error_message",
                    "updated_at",
                ])

                transaction.on_commit(
                    lambda device_id=device.id, task_source=task.source: send_watering_completed_notifications(
                        device_id=device_id,
                        source=task_source,
                    )
                )
            else:
                task.status = PumpTask.STATUS_FAILED
                task.error_message = error_message or "Pump execution failed."
                task.save(update_fields=["status", "error_message", "updated_at"])

            return Response({
                "detail": "Pump execution recorded." if success else "Pump failure recorded.",
                "last_pump_run_at": device.last_pump_run_at,
                "last_pump_run_source": device.last_pump_run_source,
            })

        # No task_id means this is a device-local pump event, normally automatic watering.
        task = PumpTask.objects.create(
            device=device,
            source=source,
            status=PumpTask.STATUS_EXECUTED if success else PumpTask.STATUS_FAILED,
            requested_at=now,
            delivered_at=now,
            executed_at=now if success else None,
            error_message=None if success else (error_message or "Pump execution failed."),
        )

        if success:
            device.last_pump_run_at = now
            device.last_pump_run_source = task.source
            device.save(update_fields=[
                "last_pump_run_at",
                "last_pump_run_source",
                "updated_at",
            ])

            transaction.on_commit(
                lambda device_id=device.id, task_source=task.source: send_watering_completed_notifications(
                    device_id=device_id,
                    source=task_source,
                )
            )

    return Response({
        "detail": "Pump execution recorded." if success else "Pump failure recorded.",
        "last_pump_run_at": device.last_pump_run_at,
        "last_pump_run_source": device.last_pump_run_source,
    })


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, FeedPerDeviceThrottle])
def feed(request):
    """
    Query: ?secret=...&device_key=AB12CD34[&device_id=123][&from=ISO][&to=ISO]
    (device_id optional — device_key + secret is sufficient)

    Returns only the latest reading (as an array with at most one item).
    """
    device_id = request.query_params.get("device_id")
    device_key = request.query_params.get("device_key")
    secret_str = request.query_params.get("secret")

    if not (device_key and secret_str):
        return Response({"detail": "device_key and secret are required"}, status=400)

    acct = AccountSecret.objects.select_related("user").filter(secret=secret_str).first()
    if not acct:
        return Response({"detail": "invalid credentials"}, status=403)

    if device_id:
        device = get_object_or_404(
            ReadingDevice,
            id=device_id,
            device_key=device_key,
            user=acct.user,
        )
    else:
        device = get_object_or_404(
            ReadingDevice,
            device_key=device_key,
            user=acct.user,
        )

    if not device.is_active:
        return Response({"detail": "device disabled"}, status=403)

    qs = device.readings.all()
    if "from" in request.query_params:
        qs = qs.filter(timestamp__gte=request.query_params["from"])
    if "to" in request.query_params:
        qs = qs.filter(timestamp__lte=request.query_params["to"])

    # Only the latest reading (matching optional filters)
    latest = qs.order_by("-timestamp").first()
    if latest is None:
        readings_data = []
    else:
        readings_data = [ReadingSerializer(latest).data]

    return Response({
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "plant_name": device.plant_name,
            "interval_hours": device.interval_hours,
        },
        "readings": readings_data,
    })


# ---------- New: Authenticated history endpoint for charts ----------

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def history(request):
    """
    Authenticated chart data for Readings History page.

    Query params:
      - device_id: required, ID of ReadingDevice belonging to current user
      - range: "day" | "week" | "month"  (default "day")
      - metric: "temperature" | "humidity" | "light" | "moisture" (default "temperature")
      - anchor: ISO datetime for the anchor day (optional, defaults to now)

    Returns locale-neutral points:
      {
        "device": {...},
        "range": "day" | "week" | "month",
        "metric": "...",
        "unit": "°C" | "%" | "lx",
        "span": { "from": "...", "to": "..." },
        "points": [{ "at": string, "value": number }, ...]
      }

    `at` is the ISO datetime representing the start of the bucket.
    The frontend is responsible for formatting localized x-axis labels.
    """
    device_id = request.query_params.get("device_id")
    if not device_id:
        return Response({"detail": "device_id is required"}, status=400)

    try:
        device = ReadingDevice.objects.get(id=device_id, user=request.user)
    except ReadingDevice.DoesNotExist:
        raise Http404

    range_str = request.query_params.get("range", "day")
    if range_str not in VALID_RANGES:
        return Response({"detail": "range must be one of: day, week, month"}, status=400)

    metric = request.query_params.get("metric", "temperature")
    if metric not in VALID_METRICS:
        return Response({
            "detail": "metric must be one of: temperature, humidity, light, moisture"
        }, status=400)

    # Anchor date (defaults to now); parse_ts_or_now handles None/invalid gracefully
    anchor = parse_ts_or_now(request.query_params.get("anchor"))
    anchor_local = timezone.localtime(anchor)

    span_from, span_to = _span_for(range_str, anchor_local)

    # Django will convert local aware datetimes to UTC when comparing with stored timestamps
    qs = device.readings.filter(
        timestamp__gte=span_from,
        timestamp__lte=span_to,
    ).order_by("timestamp")

    # Determine number of bins
    if range_str == "day":
        bin_count = 24
    elif range_str == "week":
        bin_count = 7
    else:
        bin_count = _month_day_count(anchor_local)

    bins = [{"sum": 0.0, "cnt": 0} for _ in range(bin_count)]

    for rec in qs:
        ts_local = timezone.localtime(rec.timestamp)

        if range_str == "day":
            idx = ts_local.hour  # 0..23
        elif range_str == "week":
            idx = (ts_local.date() - span_from.date()).days  # 0..6 ideally
            if idx < 0 or idx >= bin_count:
                continue
        else:  # month
            idx = ts_local.day - 1  # 0..(days-1)
            if idx < 0 or idx >= bin_count:
                continue

        val = getattr(rec, metric, None)
        if val is None:
            continue

        try:
            val_f = float(val)
        except (TypeError, ValueError):
            continue

        # skip non-finite values (NaN, +inf, -inf) so JSON stays valid
        if not math.isfinite(val_f):
            continue

        bins[idx]["sum"] += val_f
        bins[idx]["cnt"] += 1

    values = []
    for b in bins:
        if b["cnt"]:
            values.append(round(b["sum"] / b["cnt"], 2))
        else:
            values.append(0.0)

    # Return locale-neutral bucket start timestamps instead of display labels
    if range_str == "day":
        bucket_starts = [span_from + timedelta(hours=i) for i in range(bin_count)]
    else:
        bucket_starts = [span_from + timedelta(days=i) for i in range(bin_count)]

    points = [
        {"at": bucket_starts[i].isoformat(), "value": values[i]}
        for i in range(bin_count)
    ]

    return Response({
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "plant_name": device.plant_name,
            "interval_hours": device.interval_hours,
        },
        "range": range_str,
        "metric": metric,
        "unit": HISTORY_UNITS[metric],
        "span": {
            "from": span_from.isoformat(),
            "to": span_to.isoformat(),
        },
        "points": points,
    })