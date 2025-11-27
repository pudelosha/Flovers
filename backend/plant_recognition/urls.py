from django.urls import path
from .views import PlantRecognitionView

urlpatterns = [
    path("plant-recognition/scan/", PlantRecognitionView.as_view(), name="plant-recognition-scan"),
]
