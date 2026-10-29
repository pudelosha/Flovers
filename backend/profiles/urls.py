from django.urls import path
from .views import ProfileSettingsView, ProfileNotificationsView, PushDeviceRegisterView, ProfileProgressionView
from .views_support import SupportContactView, SupportBugView, PublicSupportContactView
from .views_open import open_home

urlpatterns = [
    path("progression/", ProfileProgressionView.as_view(), name="profile-progression"),
    path("settings/", ProfileSettingsView.as_view(), name="profile-settings"),
    path("notifications/", ProfileNotificationsView.as_view(), name="profile-notifications"),
    path("push-devices/", PushDeviceRegisterView.as_view(), name="push-device-register"),

    # Support
    path("support/contact/", SupportContactView.as_view(), name="profile-support-contact"),
    path("support/public-contact/", PublicSupportContactView.as_view(), name="profile-support-public-contact"),
    path("support/bug/", SupportBugView.as_view(), name="profile-support-bug"),

    # App open / deep-link fallbacks
    path("open/home/", open_home, name="open-home"),
    path("open/task-history/", open_home, {"destination": "task-history"}, name="open-task-history"),
]
