from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/plants/", include("plants.urls")),
    path("api/locations/", include("locations.urls")),
]
