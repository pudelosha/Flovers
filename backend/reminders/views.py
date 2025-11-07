from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Reminder, ReminderTask
from .serializers import ReminderSerializer, ReminderTaskSerializer

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

        # Close all pending tasks (keep history intact)
        # Mark as completed "now".
        pending_qs = reminder.tasks.filter(status="pending")
        now = timezone.now()
        for t in pending_qs:
            t.status = "completed"
            t.completed_at = now
            t.save(update_fields=["status", "completed_at", "updated_at"])

        # Ensure one fresh pending task per updated schedule
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
        qs = ReminderTask.objects.filter(reminder__plant__user=request.user).select_related(
            "reminder", "reminder__plant"
        )

        status_param = request.query_params.get("status")
        if status_param in {"pending", "completed"}:
            qs = qs.filter(status=status_param)

        qs = qs.order_by("due_date", "id")
        data = ReminderTaskSerializer(qs, many=True).data
        return Response(data)
