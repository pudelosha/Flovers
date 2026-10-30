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
from .photo_storage import directory_path, photo_metadata, remove_photo, replace_photo


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


class PlantPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [PhotoUploadThrottle]

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
                                  upload_key=upload_key, expected=_expected(request.data))
        except (OSError, ImproperlyConfigured):
            raise PhotoError("photo_storage_unavailable", "Photo storage is temporarily unavailable.", 503)
        return Response(photo_metadata(image.plant))

    def delete(self, request, plant_id):
        self._owned_plant(request, plant_id)
        try:
            remove_photo(user=request.user, plant_id=plant_id, expected=_expected(request.data))
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
