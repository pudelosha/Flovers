from __future__ import annotations

from typing import Any
import logging

from PIL import Image, UnidentifiedImageError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .inference import predict_topk
from .serializers import PlantRecognitionResultSerializer

logger = logging.getLogger(__name__)


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
        predictions = sorted(predictions, key=lambda p: float(p.get("score", 0.0)), reverse=True)[:topk]

        # score is treated as probability (0..1)
        raw_results = [
            {
                "id": None,  # no DB link yet
                "name": p["name"],
                "latin": p["latin"],
                "probability": float(p.get("score", 0.0)),
                # keep old field for backward-compat
                "confidence": float(p.get("score", 0.0)),
            }
            for p in predictions
        ]

        serializer = PlantRecognitionResultSerializer(data=raw_results, many=True)
        serializer.is_valid(raise_exception=True)

        return Response(
            {"results": serializer.data},
            status=status.HTTP_200_OK,
        )
