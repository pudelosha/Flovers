from django.urls import path
from .views import PlantInstanceListCreateView

urlpatterns = [
    path("", PlantInstanceListCreateView.as_view(), name="plant-instance-list-create"),
]
