from django.urls import path
from .views import (
    PopularPlantDefinitionsView,
    PlantDefinitionSearchIndexView,
    PlantDefinitionProfileView,
    PlantDefinitionProfileByKeyView,
)

urlpatterns = [
    path("popular/", PopularPlantDefinitionsView.as_view(), name="plant-definitions-popular"),
    path("search-index/", PlantDefinitionSearchIndexView.as_view(), name="plant-definitions-search-index"),
    path("by-key/<slug:external_id>/profile/", PlantDefinitionProfileByKeyView.as_view(), name="plant-definitions-profile-by-key"),
    path("<int:pk>/profile/", PlantDefinitionProfileView.as_view(), name="plant-definitions-profile"),
]
