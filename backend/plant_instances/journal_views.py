"""Task Journal photo API; completed task endpoints remain backward compatible."""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from sharing.permissions import plant_access, visible_plant_ids
from .journal_storage import create_entry, delete_entry, edit_entry, next_photo_at, replace_entry_photo
from .models import JournalPhotoEntry, PlantInstance
from .photo_errors import PhotoError
from .photo_storage import image_metadata, normalize_framing
from .photo_views import PhotoUploadLimitHandler, PhotoUploadThrottle


def entry_data(entry, user):
    plant = entry.plant
    definition = plant.plant_definition
    next_at = next_photo_at(plant)
    return {
        "id": str(entry.pk), "plant_id": str(plant.pk),
        "plant_name": plant.display_name or (definition.name if definition else ""),
        "plant_latin": definition.latin if definition else "",
        "location_name": plant.location.name, "created_at": entry.created_at.isoformat(),
        "updated_at": entry.updated_at.isoformat(),
        "taken_on": entry.taken_on.isoformat() if entry.taken_on else None,
        "notes": entry.notes, "revision": entry.revision,
        "photo": image_metadata(entry.image), "access": plant_access(user, plant),
        "next_photo_at": next_at.isoformat() if next_at and plant.user_id == user.pk else None,
    }


class JournalMetadataSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=4000, trim_whitespace=False)
    taken_on = serializers.DateField(required=False, allow_null=True)
    framing = serializers.JSONField(required=False)

    def validate_taken_on(self, value):
        if value is not None and value > timezone.localdate():
            raise serializers.ValidationError("The photo date cannot be in the future.")
        return value

    def validate_framing(self, value):
        return normalize_framing(value)


class JournalCreateSerializer(JournalMetadataSerializer):
    plant_id = serializers.IntegerField(min_value=1)
    upload_key = serializers.UUIDField()
    photo = serializers.FileField(allow_empty_file=False)


class JournalEditSerializer(JournalMetadataSerializer):
    expected_revision = serializers.IntegerField(min_value=0, max_value=2147483647)


class JournalReplaceSerializer(JournalEditSerializer):
    upload_key = serializers.UUIDField()
    photo = serializers.FileField(allow_empty_file=False)


class JournalDeleteSerializer(serializers.Serializer):
    expected_revision = serializers.IntegerField(min_value=0, max_value=2147483647)


class JournalPhotoBaseView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [PhotoUploadThrottle]

    def get_throttles(self):
        return [] if self.request.method in {"GET", "HEAD"} else super().get_throttles()

    def initialize_request(self, request, *args, **kwargs):
        request.upload_handlers.insert(0, PhotoUploadLimitHandler(request))
        return super().initialize_request(request, *args, **kwargs)

    def handle_exception(self, error):
        if isinstance(error, (OSError, ImproperlyConfigured)):
            error = PhotoError("photo_storage_unavailable", "Photo storage is temporarily unavailable.", 503)
        return super().handle_exception(error)

    def _body(self, request):
        length = request.META.get("CONTENT_LENGTH")
        if length:
            try:
                too_large = int(length) > min(settings.PLANT_PHOTO_MAX_UPLOAD_BYTES, 5 * 1024 * 1024) + 64 * 1024
            except ValueError:
                too_large = True
            if too_large:
                raise PhotoError("upload_too_large", "Upload body is too large.", 413)
        return request.data

    @staticmethod
    def _visible(request):
        return JournalPhotoEntry.objects.filter(plant_id__in=visible_plant_ids(request.user), image__isnull=False).select_related(
            "plant__user", "plant__location", "plant__plant_definition", "image")

    @staticmethod
    def _owned(request, entry_id):
        if not request.user.is_active:
            raise Http404
        entry = JournalPhotoEntry.objects.filter(pk=entry_id, plant__user=request.user).first()
        if entry is None:
            raise Http404
        return entry


class JournalPhotoListCreateView(JournalPhotoBaseView):
    def get(self, request):
        entries = self._visible(request)
        plants = PlantInstance.objects.filter(user=request.user) if request.user.is_active else PlantInstance.objects.none()
        plant_id = request.query_params.get("plant_id")
        if plant_id is not None:
            try:
                plant_id = int(plant_id)
            except (ValueError, TypeError):
                raise PhotoError("invalid_photo", "Invalid plant ID.")
            entries = entries.filter(plant_id=plant_id)
            plants = plants.filter(pk=plant_id)
        availability = []
        for plant in plants:
            next_at = next_photo_at(plant)
            availability.append({"plant_id": str(plant.pk), "next_photo_at": next_at.isoformat() if next_at else None})
        return Response({"results": [entry_data(entry, request.user) for entry in entries], "availability": availability})

    def post(self, request):
        serializer = JournalCreateSerializer(data=self._body(request))
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        if not request.user.is_active or not PlantInstance.objects.filter(pk=data["plant_id"], user=request.user).exists():
            raise Http404
        upload = data.pop("photo")
        entry, created = create_entry(user=request.user, upload=upload, **data)
        return Response(entry_data(entry, request.user), status=201 if created else 200)


class JournalPhotoDetailView(JournalPhotoBaseView):
    def get(self, request, entry_id):
        entry = self._visible(request).filter(pk=entry_id).first()
        if entry is None:
            raise Http404
        return Response(entry_data(entry, request.user))

    def patch(self, request, entry_id):
        current = self._owned(request, entry_id)
        serializer = JournalEditSerializer(data=self._body(request))
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        expected = data.pop("expected_revision")
        framing = data.pop("framing", None)
        entry = edit_entry(user=request.user, entry_id=entry_id, plant_id=current.plant_id,
            expected_revision=expected, metadata=data, framing=framing)
        return Response(entry_data(entry, request.user))

    def put(self, request, entry_id):
        current = self._owned(request, entry_id)
        serializer = JournalReplaceSerializer(data=self._body(request))
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        expected = data.pop("expected_revision")
        framing = data.pop("framing", None)
        upload, key = data.pop("photo"), data.pop("upload_key")
        entry = replace_entry_photo(user=request.user, entry_id=entry_id, plant_id=current.plant_id,
            upload=upload, upload_key=key, expected_revision=expected, metadata=data, framing=framing)
        return Response(entry_data(entry, request.user))

    def delete(self, request, entry_id):
        current = self._owned(request, entry_id)
        serializer = JournalDeleteSerializer(data=self._body(request))
        serializer.is_valid(raise_exception=True)
        delete_entry(user=request.user, entry_id=entry_id, plant_id=current.plant_id, **serializer.validated_data)
        return Response(status=204)
