from rest_framework import serializers


class PlantRecognitionResultSerializer(serializers.Serializer):
    """
    Single recognition candidate as returned to the mobile app.

    Response item:
      {
        id: number | null;
        name: string;
        latin: string;
        probability: number;  # 0..1
        confidence: number;   # kept for backward compatibility
      }
    """
    id = serializers.IntegerField(allow_null=True, required=False)
    name = serializers.CharField()
    latin = serializers.CharField()
    probability = serializers.FloatField()
    confidence = serializers.FloatField(required=False)
