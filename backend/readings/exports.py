"""Owner-scoped readings export data and spreadsheet rendering."""

from dataclasses import dataclass
from io import BytesIO

from django.utils import timezone
from core.spreadsheets import append_safe_row
from .models import ReadingDevice, Reading, PumpTask


def _format_dt_local(dt):
    if not dt:
        return ""
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M:%S")


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


def _build_readings_export_workbook(
    readings, pump_tasks, sort_key: str, sort_dir: str
) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    reverse = sort_dir == "desc"

    reading_rows = []

    for reading in readings:
        device = reading.device

        reading_rows.append(
            {
                "plant_name": device.plant_name or "",
                "location": device.plant_location or "",
                "device_name": device.device_name or "",
                "latest_temperature": reading.temperature,
                "latest_humidity": reading.humidity,
                "latest_light": reading.light,
                "latest_moisture": reading.moisture,
                "created_at": _format_dt_local(reading.timestamp),
                "_ts": reading.timestamp,
            }
        )

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
    append_safe_row(ws_readings, readings_headers)

    for cell in ws_readings[1]:
        cell.font = Font(bold=True)

    for row in reading_rows:
        append_safe_row(
            ws_readings,
            [
                row["plant_name"],
                row["location"],
                row["device_name"],
                row["latest_temperature"],
                row["latest_humidity"],
                row["latest_light"],
                row["latest_moisture"],
                row["created_at"],
            ],
        )

    _autosize_worksheet_columns(ws_readings)

    task_rows = []

    for task in pump_tasks:
        device = task.device

        task_rows.append(
            {
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
            }
        )

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
    append_safe_row(ws_tasks, tasks_headers)

    for cell in ws_tasks[1]:
        cell.font = Font(bold=True)

    for row in task_rows:
        append_safe_row(
            ws_tasks,
            [
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
            ],
        )

    _autosize_worksheet_columns(ws_tasks)

    stream = BytesIO()
    wb.save(stream)
    return stream.getvalue()


@dataclass(frozen=True)
class ReadingExport:
    filename: str
    content: bytes
    context: dict


def build_readings_export(user, data) -> ReadingExport:
    plant_id = data.get("plantId")
    location = data.get("location")
    status_value = data.get("status")
    sort_key = data.get("sortKey", "name")
    sort_dir = data.get("sortDir", "asc")

    device_qs = ReadingDevice.objects.filter(
        user=user, plant__user=user
    ).select_related("plant")

    if plant_id:
        device_qs = device_qs.filter(plant_id=plant_id)

    if location:
        device_qs = device_qs.filter(plant_location=location)

    if status_value == "enabled":
        device_qs = device_qs.filter(is_active=True)
    elif status_value == "disabled":
        device_qs = device_qs.filter(is_active=False)

    readings_qs = Reading.objects.filter(device__in=device_qs).select_related("device")

    pump_tasks_qs = PumpTask.objects.filter(device__in=device_qs).select_related(
        "device"
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

    return ReadingExport(attachment_filename, xlsx_bytes, context)
