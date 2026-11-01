from django.urls import path
from .journal_views import JournalPhotoDetailView, JournalPhotoListCreateView

from .journal_feed import JournalFeedView, JournalOptionsView, JournalAvailabilityView

urlpatterns = [
    path("entries/", JournalFeedView.as_view(), name="journal-feed"),
    path("options/", JournalOptionsView.as_view(), name="journal-options"),
    path("photo-availability/", JournalAvailabilityView.as_view(), name="journal-photo-availability"),
    path("photos/", JournalPhotoListCreateView.as_view(), name="journal-photo-list"),
    path("photos/<uuid:entry_id>/", JournalPhotoDetailView.as_view(), name="journal-photo-detail"),
]
