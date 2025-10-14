from django.urls import path
from .views import PopularPlantsView, PlantSearchIndexView, PlantProfileView

urlpatterns = [
    path("popular/", PopularPlantsView.as_view(), name="plants-popular"),
    path("search-index/", PlantSearchIndexView.as_view(), name="plants-search-index"),
    path("<int:pk>/profile/", PlantProfileView.as_view(), name="plants-profile"),
]
