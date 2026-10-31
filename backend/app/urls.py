from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

api_patterns = [
    path("auth/", include("accounts.urls")),
    path("profile/", include("profiles.urls")),
    path("contacts/", include("contacts.urls")),
    path("sharing/", include("sharing.urls")),
    path("journal/", include("plant_instances.journal_urls")),
    path("plant-definitions/", include("plant_definitions.urls")),
    path("plant-instances/", include("plant_instances.urls")),
    path("locations/", include("locations.urls")),
    path("reminders/", include("reminders.urls")),
    path("readings/", include("readings.urls")),
    path("plant-recognition/", include("plant_recognition.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
    *api_patterns,
]

# Serve uploaded media in development only
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
