from django.urls import path
from .views import ProfileSettingsView, ProfileNotificationsView

urlpatterns = [
    path("settings/", ProfileSettingsView.as_view(), name="profile-settings"),
    path("notifications/", ProfileNotificationsView.as_view(), name="profile-notifications"),
]
