from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from . import services
from .serializers import ContactNameSerializer, InvitationSerializer


class ActiveAccountPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_active)


class InvitationHourlyThrottle(UserRateThrottle):
    scope = "contact_invitation_hour"


class InvitationDailyThrottle(UserRateThrottle):
    scope = "contact_invitation_day"


def ok(data, message, code=status.HTTP_200_OK):
    return Response({"status": "success", "message": message, "data": data}, status=code)


def validated(serializer_class, data):
    serializer = serializer_class(data=data)
    if not serializer.is_valid():
        raise services.ContactError("invalid", "Validation failed.", errors=serializer.errors)
    return serializer.validated_data


class ContactsBaseView(APIView):
    permission_classes = [IsAuthenticated, ActiveAccountPermission]


class ContactsView(ContactsBaseView):
    def get(self, request):
        return ok(services.contact_snapshot(request.user), "Contacts fetched.")


class InvitationCreateView(ContactsBaseView):
    throttle_classes = [UserRateThrottle, AnonRateThrottle, InvitationHourlyThrottle, InvitationDailyThrottle]

    def post(self, request):
        data = validated(InvitationSerializer, request.data)
        return ok(services.invite_contact(request.user, data["identifier"]), "Invitation sent.", status.HTTP_201_CREATED)


class InvitationAcceptView(ContactsBaseView):
    def post(self, request, invitation_id):
        return ok(services.accept_invitation(request.user, invitation_id), "Invitation accepted.")


class InvitationDismissView(ContactsBaseView):
    def delete(self, request, invitation_id):
        return ok(services.dismiss_invitation(request.user, invitation_id), "Invitation dismissed.")


class ContactDetailView(ContactsBaseView):
    def patch(self, request, user_id):
        data = validated(ContactNameSerializer, request.data)
        return ok(services.rename_contact(request.user, user_id, data["name"]), "Contact updated.")

    def delete(self, request, user_id):
        return ok(services.remove_contact(request.user, user_id), "Contact removed.")
