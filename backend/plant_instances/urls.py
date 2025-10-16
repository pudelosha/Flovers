from django.urls import path
from .views import PlantInstanceListCreateView, PlantInstanceDetailView

urlpatterns = [
    path("", PlantInstanceListCreateView.as_view(), name="plant-instance-list-create"),
    path("<int:pk>/", PlantInstanceDetailView.as_view(), name="plant-instance-detail"),
]
