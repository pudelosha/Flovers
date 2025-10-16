from django.urls import path
from .views import (
    PopularPlantDefinitionsView,
    PlantDefinitionSearchIndexView,
    PlantDefinitionProfileView,
)

urlpatterns = [
    path("popular/", PopularPlantDefinitionsView.as_view(), name="plant-definitions-popular"),
    path("search-index/", PlantDefinitionSearchIndexView.as_view(), name="plant-definitions-search-index"),
    path("<int:pk>/profile/", PlantDefinitionProfileView.as_view(), name="plant-definitions-profile"),
]
