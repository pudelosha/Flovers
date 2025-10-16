from django.urls import path
from .views import PlantInstanceCreateView

urlpatterns = [
    path("", PlantInstanceCreateView.as_view(), name="plant-instances-create"),
]
