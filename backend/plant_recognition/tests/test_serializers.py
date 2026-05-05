from plant_recognition.serializers import PlantRecognitionResultSerializer


def test_plant_recognition_result_serializer_accepts_current_result_shape():
    serializer = PlantRecognitionResultSerializer(
        data={
            "id": None,
            "name": "Monstera deliciosa",
            "latin": "Monstera deliciosa",
            "external_id": "monstera_deliciosa",
            "image_thumb": None,
            "probability": 0.91,
            "confidence": 0.91,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["external_id"] == "monstera_deliciosa"


def test_plant_recognition_result_serializer_requires_probability():
    serializer = PlantRecognitionResultSerializer(
        data={
            "name": "Monstera deliciosa",
            "latin": "Monstera deliciosa",
            "external_id": "monstera_deliciosa",
        }
    )

    assert serializer.is_valid() is False
    assert "probability" in serializer.errors
