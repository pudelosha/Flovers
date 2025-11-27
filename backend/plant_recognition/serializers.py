from rest_framework import serializers


class PlantRecognitionResultSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()
    latin = serializers.CharField()
    confidence = serializers.FloatField()
