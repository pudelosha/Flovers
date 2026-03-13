from __future__ import annotations

from typing import Any
import logging

from django.conf import settings
from PIL import Image, UnidentifiedImageError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .utils import normalize_plant_key

from .inference import predict_topk
from .serializers import PlantRecognitionResultSerializer
from plant_definitions.models import PlantDefinition

logger = logging.getLogger(__name__)


def _abs_media_url(request, value) -> str | None:
    """
    Build an absolute URL that works for real devices.

    Supports:
    - ImageField/FileField (has .url)
    - raw strings:
        - full URL: https://...
        - relative media path: plants/thumb/x.jpg
        - bare filename: x.jpg (assumes plants/thumb/)
    """
    if not value:
        return None

    rel = getattr(value, "url", None)

    # Support string values too
    if not rel and isinstance(value, str):
        v = value.strip()
        if not v:
            return None

        if v.startswith("http://") or v.startswith("https://"):
            return v

        v = v.replace("\\", "/").lstrip("/")
        if "/" not in v:
            rel = f"{settings.MEDIA_URL.rstrip('/')}/plants/thumb/{v}"
        else:
            rel = f"{settings.MEDIA_URL.rstrip('/')}/{v}"

    if not rel:
        return None

    base = (getattr(settings, "SITE_URL", "") or "").strip()
    if base:
        return base.rstrip("/") + rel

    return request.build_absolute_uri(rel) if request else rel


class PlantRecognitionView(APIView):
    """
    POST /api/plant-recognition/scan/

    Body: multipart/form-data with field "image"
    Optional field "topk" (default=3).

    Response:
    {
      "results": [
        {
          "id": null,
          "name": "Nephrolepis exaltata",
          "latin": "Nephrolepis exaltata",
          "external_id": "nephrolepis_exaltata",
          "image_thumb": "https://example.com/media/plants/thumb/nephrolepis.jpg",
          "probability": 0.85,
          "confidence": 0.85
        },
        ...
      ]
    }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args: Any, **kwargs: Any):
        file = request.FILES.get("image")
        if file is None:
            return Response(
                {"detail": "No image file provided under 'image' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            image = Image.open(file)
        except UnidentifiedImageError:
            return Response(
                {"detail": "Uploaded file is not a valid image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # topk: between 1 and 10, default 3
        try:
            topk_raw = request.data.get("topk", "3")
            topk = max(1, min(10, int(topk_raw)))
        except (TypeError, ValueError):
            topk = 3

        try:
            # predictions example:
            # [
            #   { "id": "ml-0", "name": "...", "latin": "...", "score": 0.85, "rank": 1 },
            #   ...
            # ]
            predictions = predict_topk(image, topk=topk)
        except Exception as e:
            logger.exception("Plant recognition failed")
            return Response(
                {"detail": f"Internal error during plant recognition: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Ensure best-first ordering regardless of inference output
        predictions = sorted(
            predictions,
            key=lambda p: float(p.get("score", 0.0)),
            reverse=True,
        )[:topk]

        external_ids = [normalize_plant_key(p["latin"]) for p in predictions]

        plant_definitions = PlantDefinition.objects.filter(
            external_id__in=external_ids
        ).only("external_id", "image_thumb")

        plant_definitions_map = {
            plant.external_id: plant for plant in plant_definitions
        }

        # score is treated as probability (0..1)
        raw_results = []
        for p in predictions:
            external_id = normalize_plant_key(p["latin"])
            plant_definition = plant_definitions_map.get(external_id)

            image_thumb = None
            if plant_definition and plant_definition.image_thumb:
                image_thumb = _abs_media_url(request, plant_definition.image_thumb)

            raw_results.append(
                {
                    "id": None,
                    "name": p["name"],
                    "latin": p["latin"],
                    "external_id": external_id,
                    "image_thumb": image_thumb,
                    "probability": float(p.get("score", 0.0)),
                    "confidence": float(p.get("score", 0.0)),
                }
            )

        serializer = PlantRecognitionResultSerializer(data=raw_results, many=True)
        serializer.is_valid(raise_exception=True)

        return Response(
            {"results": serializer.data},
            status=status.HTTP_200_OK,
        )