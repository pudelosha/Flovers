from django.urls import path
from .views import ProfileSettingsView, ProfileNotificationsView, PushDeviceRegisterView
from .views_support import SupportContactView, SupportBugView
from .views_open import open_home

urlpatterns = [
    path("settings/", ProfileSettingsView.as_view(), name="profile-settings"),
    path("notifications/", ProfileNotificationsView.as_view(), name="profile-notifications"),
    path("push-devices/", PushDeviceRegisterView.as_view(), name="push-device-register"),

    # Support
    path("support/contact/", SupportContactView.as_view(), name="profile-support-contact"),
    path("support/bug/", SupportBugView.as_view(), name="profile-support-bug"),

    # App open / deep-link fallbacks
    path("open/home/", open_home, name="open-home"),
]