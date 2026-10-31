from django.urls import path
from .journal_views import JournalPhotoDetailView, JournalPhotoListCreateView

urlpatterns = [
    path("photos/", JournalPhotoListCreateView.as_view(), name="journal-photo-list"),
    path("photos/<uuid:entry_id>/", JournalPhotoDetailView.as_view(), name="journal-photo-detail"),
]
