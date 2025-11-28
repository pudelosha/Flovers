from django.urls import path
from .views import PlantRecognitionView

urlpatterns = [
    path("scan/", PlantRecognitionView.as_view(), name="plant-recognition-scan"),
]
