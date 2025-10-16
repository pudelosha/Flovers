from django.urls import path
from .views import (
    ReminderListCreateView,   # you already have this
    ReminderTaskListView,     # add this view (see below)
    TaskCompleteView,         # you already have this
)

urlpatterns = [
    path("", ReminderListCreateView.as_view(), name="reminders-list-create"),
    path("tasks/", ReminderTaskListView.as_view(), name="reminder-tasks-list"),           # <-- NEW
    path("tasks/<int:pk>/complete/", TaskCompleteView.as_view(), name="reminder-task-complete"),
]
