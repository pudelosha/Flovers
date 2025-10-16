from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Reminder, ReminderTask
from .serializers import ReminderSerializer, ReminderTaskSerializer

class ReminderListCreateView(generics.ListCreateAPIView):
    """
    (Optional) Basic list/create for reminders, filtered by user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReminderSerializer

    def get_queryset(self):
        return Reminder.objects.filter(user=self.request.user).select_related("plant")

    def perform_create(self, serializer):
        reminder = serializer.save(user=self.request.user)
        reminder.ensure_one_pending_task()


class TaskCompleteView(APIView):
    """
    POST /api/reminders/tasks/<id>/complete/
    Marks a task as completed and spawns the next one.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        task = get_object_or_404(
            ReminderTask.objects.select_related("reminder", "reminder__plant"),
            pk=pk,
            user=request.user,
        )
        new_task = task.mark_complete_and_spawn_next()
        return Response(
            {
                "completed_task": ReminderTaskSerializer(task).data,
                "next_task": ReminderTaskSerializer(new_task).data if new_task else None,
            },
            status=status.HTTP_200_OK,
        )
