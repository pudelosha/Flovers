from django.urls import path
from .views import ProfileSettingsView, ProfileNotificationsView, PushDeviceRegisterView

urlpatterns = [
    path("settings/", ProfileSettingsView.as_view(), name="profile-settings"),
    path("notifications/", ProfileNotificationsView.as_view(), name="profile-notifications"),
    path("push-devices/", PushDeviceRegisterView.as_view(), name="push-device-register"),
]
