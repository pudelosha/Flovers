from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Reminder, ReminderTask
from .serializers import ReminderSerializer, ReminderTaskSerializer, ReminderTaskJournalSerializer

from datetime import timedelta


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
