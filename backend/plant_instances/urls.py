from django.urls import path
from .views import PlantInstanceListCreateView, PlantInstanceDetailView, PlantInstanceByQRView
from reminders.views import PlantJournalView

urlpatterns = [
    path("", PlantInstanceListCreateView.as_view(), name="plant-instance-list-create"),
    path("<int:pk>/", PlantInstanceDetailView.as_view(), name="plant-instance-detail"),
    path("by-qr/", PlantInstanceByQRView.as_view(), name="plant-instance-by-qr"),
    path("<int:plant_id>/journal/", PlantJournalView.as_view(), name="plant-instance-journal"),
]
