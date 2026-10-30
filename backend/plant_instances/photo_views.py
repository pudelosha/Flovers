import uuid
import os

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadhandler import FileUploadHandler
from django.http import FileResponse, Http404, HttpResponse
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from sharing.permissions import visible_plant_ids
from .models import PlantImage, PlantInstance
from .photo_errors import PhotoError
from .photo_storage import directory_path, normalize_framing, photo_metadata, remove_photo, replace_photo, update_photo_framing


class PhotoUploadThrottle(UserRateThrottle):
    scope = "plant_photo_write"
    rate = "30/hour"


class PhotoUploadLimitHandler(FileUploadHandler):
    def __init__(self, request):
        super().__init__(request)
        self.received = 0

    def receive_data_chunk(self, raw_data, start):
        self.received += len(raw_data)
        if self.received > min(settings.PLANT_PHOTO_MAX_UPLOAD_BYTES, 5 * 1024 * 1024):
            raise PhotoError("upload_too_large", "Photos must be no larger than 5 MB.", 413)
        return raw_data

    def file_complete(self, file_size):
        return None


def _expected(data):
    value = data.get("expected_photo_id")
    if value in (None, ""):
        return None
    if value == "none":
        return "none"
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        raise PhotoError("invalid_photo", "Invalid photo version.")


def _expected_framing_revision(data, required=False):
    value = data.get("expected_framing_revision")
    if value is None and not required:
        return None
    if type(value) is int and 0 <= value <= 2147483647:
        return value
    if isinstance(value, str) and value.isascii() and value.isdigit() and len(value) <= 10 and int(value) <= 2147483647:
        return int(value)
    raise PhotoError("invalid_photo", "A valid photo framing version is required.")


class PlantPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [PhotoUploadThrottle]

    def get_throttles(self):
        # Capability checks never spend the owner's image-write allowance.
        if self.request.method in {"GET", "HEAD"}:
            return []
        return super().get_throttles()

    def initialize_request(self, request, *args, **kwargs):
        request.upload_handlers.insert(0, PhotoUploadLimitHandler(request))
        return super().initialize_request(request, *args, **kwargs)

    def _owned_plant(self, request, plant_id):
        if not PlantInstance.objects.filter(pk=plant_id, user=request.user).exists():
            raise Http404
        length = request.META.get("CONTENT_LENGTH")
        if length:
            try:
                too_large = int(length) > min(settings.PLANT_PHOTO_MAX_UPLOAD_BYTES, 5 * 1024 * 1024) + 64 * 1024
            except ValueError:
                too_large = True
            if too_large:
                raise PhotoError("upload_too_large", "Upload body is too large.", 413)

    def get(self, request, plant_id):
        self._owned_plant(request, plant_id)
        return Response({"framing_supported": True})

    def put(self, request, plant_id):
        self._owned_plant(request, plant_id)
        upload = request.data.get("photo")
        if not hasattr(upload, "chunks"):
            raise PhotoError("invalid_photo", "A photo file is required.")
        try:
            upload_key = uuid.UUID(str(request.data.get("upload_key")))
        except (ValueError, TypeError, AttributeError):
            raise PhotoError("invalid_photo", "An upload key is required.")
        try:
            image = replace_photo(user=request.user, plant_id=plant_id, upload=upload,
                                  upload_key=upload_key, expected=_expected(request.data),
                                  framing=normalize_framing(request.data["framing"]) if "framing" in request.data else None,
                                  expected_framing_revision=_expected_framing_revision(request.data))
        except (OSError, ImproperlyConfigured):
            raise PhotoError("photo_storage_unavailable", "Photo storage is temporarily unavailable.", 503)
        return Response(photo_metadata(image.plant))

    def patch(self, request, plant_id):
        self._owned_plant(request, plant_id)
        expected = _expected(request.data)
        if expected in (None, "none"):
            raise PhotoError("invalid_photo", "The current photo version is required.")
        image = update_photo_framing(user=request.user, plant_id=plant_id,
            framing=normalize_framing(request.data.get("framing")), expected=expected,
            expected_framing_revision=_expected_framing_revision(request.data, required=True))
        return Response(photo_metadata(image.plant))

    def delete(self, request, plant_id):
        self._owned_plant(request, plant_id)
        try:
            remove_photo(user=request.user, plant_id=plant_id, expected=_expected(request.data),
                         expected_framing_revision=_expected_framing_revision(request.data))
        except (OSError, ImproperlyConfigured):
            raise PhotoError("photo_storage_unavailable", "Photo storage is temporarily unavailable.", 503)
        return Response(status=204)


class PlantPhotoFileView(APIView):
    permission_classes = [IsAuthenticated]

    def _image_path(self, request, plant_id, photo_id):
        image = PlantImage.objects.filter(pk=photo_id, plant_id=plant_id,
                                         plant_id__in=visible_plant_ids(request.user)).first()
        if image is None:
            raise Http404
        variant = request.query_params.get("variant", "display")
        if variant not in {"display", "thumbnail"}:
            raise PhotoError("invalid_photo", "Unknown image variant.")
        try:
            path = directory_path(image.directory) / (variant + ".jpg")
        except (ValueError, OSError, ImproperlyConfigured):
            raise Http404
        if not path.is_file():
            raise Http404
        return path

    @staticmethod
    def _headers(response, size):
        response["Content-Type"] = "image/jpeg"
        response["Content-Length"] = str(size)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Disposition"] = 'inline; filename="plant-photo.jpg"'
        response["Vary"] = "Authorization"
        return response

    def get(self, request, plant_id, photo_id):
        path = self._image_path(request, plant_id, photo_id)
        try:
            stream = path.open("rb")
        except FileNotFoundError:
            raise Http404
        # A concurrent replacement may unlink the path after opening it. The
        # open descriptor still refers to the authorized, complete old image.
        return self._headers(FileResponse(stream, content_type="image/jpeg"), os.fstat(stream.fileno()).st_size)

    def head(self, request, plant_id, photo_id):
        path = self._image_path(request, plant_id, photo_id)
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            raise Http404
        return self._headers(HttpResponse(content_type="image/jpeg"), size)
