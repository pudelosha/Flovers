from django.urls import path
from .views import LocationsListCreateView, LocationDetailView

urlpatterns = [
    path("", LocationsListCreateView.as_view(), name="locations-list-create"),
    path("<int:pk>/", LocationDetailView.as_view(), name="location-detail"),
]
