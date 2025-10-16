from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/plant-definitions/", include("plant_definitions.urls")),
    path("api/plant-instances/", include("plant_instances.urls")),
    path("api/locations/", include("locations.urls")),
]
