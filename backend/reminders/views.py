import logging
from io import BytesIO
from datetime import datetime, timedelta

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView

from openpyxl import Workbook
from openpyxl.styles import Font

from core.emailing import send_templated_email

from .models import Reminder, ReminderTask
from .serializers import (
    ReminderSerializer,
    ReminderTaskSerializer,
    ReminderTaskJournalSerializer,
    ReminderTaskExportEmailSerializer,
)

logger = logging.getLogger(__name__)


UI_TO_MODEL_TYPE = {
    "watering": "water",
    "moisture": "moisture",
    "fertilising": "fertilize",
    "care": "care",
    "repot": "repot",
}


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


def _plant_display_name(plant) -> str:
    if getattr(plant, "display_name", None):
        return plant.display_name
    plant_def = getattr(plant, "plant_definition", None)
    if plant_def and getattr(plant_def, "name", None):
        return plant_def.name
    return f"Plant #{plant.id}"


def _location_display_name(plant) -> str:
    location = getattr(plant, "location", None)
    if location and getattr(location, "name", None):
        return location.name
    return ""


def _format_datetime_local(dt) -> str:
    if not dt:
        return ""
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M:%S")


def _format_date_value(value) -> str:
    if not value:
        return ""
    return value.strftime("%Y-%m-%d")


def _autosize_worksheet_columns(ws):
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                cell_value = str(cell.value or "")
            except Exception:
                cell_value = ""
            if len(cell_value) > max_len:
                max_len = len(cell_value)
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, 12), 42)


def _build_export_rows(tasks, sort_key: str, sort_dir: str):
    rows = []

    for task in tasks:
        reminder = task.reminder
        plant = reminder.plant

        row = {
            "task_id": task.id,
            "status": task.status,
            "status_label": "Completed" if task.status == "completed" else "Pending",
            "type_label": reminder.get_type_display(),
            "plant": _plant_display_name(plant),
            "location": _location_display_name(plant),
            "due_date": _format_date_value(task.due_date),
            "completed_at": _format_datetime_local(task.completed_at),
            "note": task.note or "",
            "reminder_start_date": _format_date_value(reminder.start_date),
            "interval": f"{reminder.interval_value} {reminder.interval_unit}",
            "reminder_active": "Yes" if reminder.is_active else "No",
            "_completed_sort": task.completed_at or None,
            "_due_sort": task.due_date,
        }
        rows.append(row)

    reverse = sort_dir == "desc"

    if sort_key == "completedAt":
        completed_rows = [r for r in rows if r["status"] == "completed"]
        pending_rows = [r for r in rows if r["status"] == "pending"]

        completed_rows.sort(
            key=lambda r: r["_completed_sort"] or timezone.now(),
            reverse=reverse,
        )
        pending_rows.sort(
            key=lambda r: r["_due_sort"],
            reverse=reverse,
        )
        return completed_rows + pending_rows

    if sort_key == "plant":
        rows.sort(
            key=lambda r: ((r["plant"] or "").lower(), r["_due_sort"]),
            reverse=reverse,
        )
        return rows

    if sort_key == "location":
        rows.sort(
            key=lambda r: ((r["location"] or "").lower(), (r["plant"] or "").lower(), r["_due_sort"]),
            reverse=reverse,
        )
        return rows

    return rows


def _build_export_workbook(rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Task History"

    headers = [
        "Task ID",
        "Status",
        "Task Type",
        "Plant",
        "Location",
        "Due Date",
        "Completed At",
        "Note",
        "Reminder Start Date",
        "Interval",
        "Reminder Active",
    ]
    ws.append(headers)

    for cell in ws[1]:
        cell.font = Font(bold=True)

    for row in rows:
        ws.append([
            row["task_id"],
            row["status_label"],
            row["type_label"],
            row["plant"],
            row["location"],
            row["due_date"],
            row["completed_at"],
            row["note"],
            row["reminder_start_date"],
            row["interval"],
            row["reminder_active"],
        ])

    _autosize_worksheet_columns(ws)

    stream = BytesIO()
    wb.save(stream)
    return stream.getvalue()


class ReminderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReminderSerializer

    def get_queryset(self):
        return Reminder.objects.filter(user=self.request.user).select_related("plant")

    def perform_create(self, serializer):
        reminder = serializer.save(user=self.request.user)
        reminder.ensure_one_pending_task()


class ReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/reminders/<id>/
    PATCH  /api/reminders/<id>/
    DELETE /api/reminders/<id>/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReminderSerializer

    def get_queryset(self):
        return Reminder.objects.filter(user=self.request.user).select_related("plant")

    def perform_update(self, serializer):
        """
        On update:
        - Save new fields
        - Close any pending task(s)
        - Create the new pending task based on updated schedule rules
        """
        reminder = serializer.save(user=self.request.user)

        pending_qs = reminder.tasks.filter(status="pending")
        now = timezone.now()
        for t in pending_qs:
            t.status = "completed"
            t.completed_at = now
            t.save(update_fields=["status", "completed_at", "updated_at"])

        reminder.ensure_one_pending_task()


class TaskCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        task = get_object_or_404(
            ReminderTask.objects.select_related("reminder", "reminder__plant"),
            pk=pk,
            user=request.user,
        )

        note = request.data.get("note") or request.data.get("notes")

        new_task = task.mark_complete_and_spawn_next(note=note)
        return Response(
            {
                "completed_task": ReminderTaskSerializer(task).data,
                "next_task": ReminderTaskSerializer(new_task).data if new_task else None,
            },
            status=status.HTTP_200_OK,
        )


class ReminderTaskListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ReminderTask.objects.filter(
            reminder__plant__user=request.user
        ).select_related("reminder", "reminder__plant")

        status_param = request.query_params.get("status")
        if status_param in {"pending", "completed"}:
            qs = qs.filter(status=status_param)

        qs = qs.order_by("due_date", "id")
        data = ReminderTaskSerializer(qs, many=True).data
        return Response(data)


class ReminderTaskDetailDeleteView(APIView):
    """
    DELETE /api/reminders/tasks/<pk>/

    Physically delete a single reminder task (typically a *completed* history item)
    that belongs to the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int):
        task = get_object_or_404(
            ReminderTask.objects.select_related("reminder", "reminder__plant"),
            pk=pk,
            user=request.user,
        )

        if task.status != "completed":
            return Response(
                {"detail": "Only completed tasks can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReminderTaskBulkDeleteView(APIView):
    """
    POST /api/reminders/tasks/bulk-delete/

    Only tasks belonging to the authenticated user are affected.
    We target *completed* tasks (history).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mode = request.data.get("mode")

        qs = ReminderTask.objects.filter(
            user=request.user,
            status="completed",
        ).select_related(
            "reminder", "reminder__plant", "reminder__plant__location"
        )

        if mode == "plant":
            plant_id = request.data.get("plantId")
            if not plant_id:
                return Response(
                    {"detail": "plantId is required for mode='plant'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(reminder__plant_id=plant_id)

        elif mode == "location":
            location_name = request.data.get("location")
            if not location_name:
                return Response(
                    {"detail": "location is required for mode='location'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(reminder__plant__location__name=location_name)

        elif mode == "types":
            ui_types = request.data.get("types") or []
            if not isinstance(ui_types, list) or not ui_types:
                return Response(
                    {"detail": "Non-empty 'types' list is required for mode='types'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            mapping = {
                "watering": "water",
                "moisture": "moisture",
                "fertilising": "fertilize",
                "care": "care",
                "repot": "repot",
            }

            model_types = [mapping[t] for t in ui_types if t in mapping]
            if not model_types:
                return Response(
                    {"detail": "No valid types provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            qs = qs.filter(reminder__type__in=model_types)

        elif mode == "olderThan":
            days = request.data.get("days")
            try:
                days = int(days)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "days must be an integer for mode='olderThan'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cutoff = timezone.now() - timedelta(days=days)
            qs = qs.filter(
                completed_at__isnull=False,
                completed_at__lt=cutoff,
            )

        else:
            return Response(
                {
                    "detail": "Invalid mode. Expected 'plant', 'location', 'types', or 'olderThan'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = qs.delete()
        return Response(
            {"deleted": deleted_count},
            status=status.HTTP_200_OK,
        )


class ReminderTaskExportEmailView(APIView):
    """
    POST /api/reminders/tasks/export-email/

    Sends an email with an XLSX attachment containing task history data
    filtered by the provided criteria.

    When includePending=true, pending tasks are added as well.
    Date filters (completedFrom/completedTo) apply only to completed tasks.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReminderTaskExportEmailSerializer(data=request.data)
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
        location_name = data.get("location")
        ui_types = data.get("types") or []
        completed_from = data.get("completedFrom")
        completed_to = data.get("completedTo")
        sort_key = data.get("sortKey", "completedAt")
        sort_dir = data.get("sortDir", "desc")
        include_pending = data.get("includePending", False)

        base_qs = (
            ReminderTask.objects
            .filter(user=request.user)
            .select_related(
                "reminder",
                "reminder__plant",
                "reminder__plant__location",
                "reminder__plant__plant_definition",
            )
        )

        if plant_id:
            base_qs = base_qs.filter(reminder__plant_id=plant_id)

        if location_name:
            base_qs = base_qs.filter(reminder__plant__location__name=location_name)

        if ui_types:
            model_types = [UI_TO_MODEL_TYPE[t] for t in ui_types if t in UI_TO_MODEL_TYPE]
            if not model_types:
                return Response(
                    {"detail": "No valid task types provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            base_qs = base_qs.filter(reminder__type__in=model_types)

        completed_qs = base_qs.filter(status="completed")
        pending_qs = base_qs.filter(status="pending") if include_pending else base_qs.none()

        if completed_from:
            completed_qs = completed_qs.filter(completed_at__date__gte=completed_from)

        if completed_to:
            completed_qs = completed_qs.filter(completed_at__date__lte=completed_to)

        tasks = list(completed_qs) + list(pending_qs)
        rows = _build_export_rows(tasks, sort_key=sort_key, sort_dir=sort_dir)
        xlsx_bytes = _build_export_workbook(rows)

        now_label = timezone.localtime(timezone.now()).strftime("%Y%m%d-%H%M%S")
        attachment_filename = f"flovers-task-history-{now_label}.xlsx"

        completed_count = sum(1 for t in tasks if t.status == "completed")
        pending_count = sum(1 for t in tasks if t.status == "pending")

        context = {
            "plant_value": str(plant_id) if plant_id else "Any plant",
            "location_value": location_name or "Any location",
            "types_value": ", ".join(ui_types) if ui_types else "All task types",
            "completed_from_value": completed_from.strftime("%Y-%m-%d") if completed_from else "Not set",
            "completed_to_value": completed_to.strftime("%Y-%m-%d") if completed_to else "Not set",
            "sort_key_value": sort_key,
            "sort_dir_value": sort_dir,
            "include_pending": include_pending,
            "total_count": len(tasks),
            "completed_count": completed_count,
            "pending_count": pending_count,
            "attachment_filename": attachment_filename,
        }

        try:
            send_templated_email(
                to_email=to_email,
                template_name="reminders/task_history_export",
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
        except Exception:
            logger.exception("Failed to send task history export email.")
            return Response(
                {"detail": "Failed to send export email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Task history export email sent."},
            status=status.HTTP_200_OK,
        )


class PlantJournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, plant_id: int):
        qs = (
            ReminderTask.objects
            .filter(
                user=request.user,
                status="completed",
                reminder__plant_id=plant_id,
            )
            .select_related("reminder")
            .order_by("-completed_at", "-id")
        )

        data = ReminderTaskJournalSerializer(qs, many=True).data
        return Response(data)