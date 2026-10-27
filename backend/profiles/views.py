from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, serializers

from .models import PushDevice, ProfileSettings, ProfileNotifications
from .serializers import PushDeviceSerializer, ProfileSettingsSerializer, ProfileNotificationsSerializer


def ok(message: str, data: dict | None = None, code=status.HTTP_200_OK):
    return Response({"status": "success", "message": message, "data": data or {}}, status=code)


def err(message: str, errors: dict | None = None, code=status.HTTP_400_BAD_REQUEST):
    return Response({"status": "error", "message": message, "errors": errors or {}}, status=code)


class ProfileProgressionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .progression import get_progression

        return ok("Profile progression fetched.", get_progression(request.user))


class ProfileSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obj, _ = ProfileSettings.objects.get_or_create(user=request.user)
        ser = ProfileSettingsSerializer(obj)
        return ok("Profile settings fetched.", ser.data)

    def patch(self, request):
        obj, _ = ProfileSettings.objects.get_or_create(user=request.user)
        ser = ProfileSettingsSerializer(instance=obj, data=request.data, partial=True)
        if not ser.is_valid():
            return err("Validation failed.", ser.errors, code=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return ok("Profile settings updated.", ser.data)


class ProfileNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obj, _ = ProfileNotifications.objects.get_or_create(user=request.user)
        ser = ProfileNotificationsSerializer(obj)
        return ok("Profile notifications fetched.", ser.data)

    def patch(self, request):
        obj, _ = ProfileNotifications.objects.get_or_create(user=request.user)
        ser = ProfileNotificationsSerializer(instance=obj, data=request.data, partial=True)
        if not ser.is_valid():
            return err("Validation failed.", ser.errors, code=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return ok("Profile notifications updated.", ser.data)


class PushDeviceRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        token_field = serializers.CharField(max_length=512)
        try:
            token = token_field.run_validation(request.data.get("token"))
        except serializers.ValidationError as exc:
            return err("Validation failed.", {"token": exc.detail})
        PushDevice.objects.filter(user=request.user, token=token).update(is_active=False)
        return ok("Push device unregistered.")

    def post(self, request):
        """
        Register/update a device token for push notifications (idempotent).

        Body:
          token: str (FCM token)
          platform: "android" (or "ios")
        """
        ser = PushDeviceSerializer(data=request.data)
        if not ser.is_valid():
            return err("Validation failed.", ser.errors, code=status.HTTP_400_BAD_REQUEST)

        token = ser.validated_data["token"]
        platform = ser.validated_data["platform"]
        now = timezone.now()

        try:
            with transaction.atomic():
                obj, created = PushDevice.objects.update_or_create(
                    token=token,
                    defaults={
                        "user": request.user,
                        "platform": platform,
                        "is_active": True,
                        "last_seen_at": now,
                    },
                )
        except IntegrityError:
            obj = PushDevice.objects.get(token=token)
            created = False
            PushDevice.objects.filter(pk=obj.pk).update(
                user=request.user,
                platform=platform,
                is_active=True,
                last_seen_at=now,
            )
            obj.refresh_from_db()

        payload = PushDeviceSerializer(obj).data
        return ok(
            "Push device registered." if created else "Push device updated.",
            payload,
            code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
