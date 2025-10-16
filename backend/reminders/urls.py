from django.urls import path
from .views import ReminderListCreateView, TaskCompleteView

urlpatterns = [
    path("", ReminderListCreateView.as_view(), name="reminders-list-create"),
    path("tasks/<int:pk>/complete/", TaskCompleteView.as_view(), name="reminder-task-complete"),
]
