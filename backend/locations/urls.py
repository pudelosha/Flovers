from django.urls import path
from .views import LocationsListCreateView

urlpatterns = [
    path("", LocationsListCreateView.as_view(), name="locations-list-create"),
]
