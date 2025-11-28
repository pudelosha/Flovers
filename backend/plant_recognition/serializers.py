from rest_framework import serializers


class PlantRecognitionResultSerializer(serializers.Serializer):
    """
    Single recognition candidate as returned to the mobile app.

    Matches ApiRecognitionResult in the mobile client:
      {
        id: number | null;
        name: string;
        latin: string;
        confidence: number;
      }
    """
    id = serializers.IntegerField(allow_null=True, required=False)
    name = serializers.CharField()
    latin = serializers.CharField()
    confidence = serializers.FloatField()
