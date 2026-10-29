from django.urls import path

from .views import SharingDeleteView, SharingView

urlpatterns = [
    path("", SharingView.as_view(), name="sharing-list-update"),
    path("<int:share_id>/", SharingDeleteView.as_view(), name="sharing-delete"),
]
