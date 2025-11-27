from __future__ import annotations

from typing import Any

from PIL import Image, UnidentifiedImageError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .inference import predict_topk


class PlantRecognitionView(APIView):
    """
    POST /api/plant-recognition/scan/

    Body: multipart/form-data with field "image"
    Optional field "topk" (default=3).

    Response:
    {
      "best": { id, name, latin, score, rank },
      "candidates": [ ...topk items... ]
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

        try:
            topk_raw = request.data.get("topk", "3")
            topk = max(1, min(10, int(topk_raw)))
        except (TypeError, ValueError):
            topk = 3

        predictions = predict_topk(image, topk=topk)
        best = predictions[0] if predictions else None

        return Response(
            {
                "best": best,
                "candidates": predictions,
            },
            status=status.HTTP_200_OK,
        )
