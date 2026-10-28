from django.urls import path

from .views import (
    ContactDetailView, ContactsView, InvitationAcceptView,
    InvitationCreateView, InvitationDismissView,
)

urlpatterns = [
    path("", ContactsView.as_view(), name="contacts-list"),
    path("invitations/", InvitationCreateView.as_view(), name="contacts-invite"),
    path("invitations/<int:invitation_id>/accept/", InvitationAcceptView.as_view(), name="contacts-accept"),
    path("invitations/<int:invitation_id>/", InvitationDismissView.as_view(), name="contacts-dismiss"),
    path("<int:user_id>/", ContactDetailView.as_view(), name="contacts-detail"),
]
