from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/profile/", include("profiles.urls")),
    path("api/plant-definitions/", include("plant_definitions.urls")),
    path("api/plant-instances/", include("plant_instances.urls")),
    path("api/locations/", include("locations.urls")),
    path("api/reminders/", include("reminders.urls")),
    path("api/readings/", include("readings.urls")),
    path("api/plant-recognition/", include("plant_recognition.urls")),
]

# Serve uploaded media in development only
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
