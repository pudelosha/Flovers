from django.urls import path
from .views import (
    ReminderListCreateView,
    ReminderDetailView,
    ReminderTaskListView,
    TaskCompleteView,
    ReminderTaskDetailDeleteView,
    ReminderTaskBulkDeleteView,
)

urlpatterns = [
    path("", ReminderListCreateView.as_view(), name="reminders-list-create"),
    path("<int:pk>/", ReminderDetailView.as_view(), name="reminder-detail"),
    path("tasks/", ReminderTaskListView.as_view(), name="reminder-tasks-list"),
    path("tasks/<int:pk>/complete/", TaskCompleteView.as_view(), name="reminder-task-complete"),
    path("tasks/<int:pk>/", ReminderTaskDetailDeleteView.as_view(), name="reminder-task-detail-delete"),
    path("tasks/bulk-delete/", ReminderTaskBulkDeleteView.as_view(), name="reminder-task-bulk-delete"),
]
