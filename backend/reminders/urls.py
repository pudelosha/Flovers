from django.urls import path
from .views import (
    ReminderListCreateView,
    ReminderDetailView,
    ReminderTaskListView,
    TaskCompleteView,
)

urlpatterns = [
    path("", ReminderListCreateView.as_view(), name="reminders-list-create"),
    path("<int:pk>/", ReminderDetailView.as_view(), name="reminder-detail"),  # <-- NEW
    path("tasks/", ReminderTaskListView.as_view(), name="reminder-tasks-list"),
    path("tasks/<int:pk>/complete/", TaskCompleteView.as_view(), name="reminder-task-complete"),
]
