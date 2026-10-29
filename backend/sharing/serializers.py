from rest_framework import serializers


class RecipientSerializer(serializers.Serializer):
    contact_id = serializers.IntegerField(min_value=1, max_value=9223372036854775807)
    can_complete_tasks = serializers.BooleanField(default=False)
    ends_on = serializers.DateField(required=False, allow_null=True, default=None)


class PlantUpdateSerializer(serializers.Serializer):
    plant_id = serializers.IntegerField(min_value=1, max_value=9223372036854775807)
    expected_revision = serializers.IntegerField(min_value=0)
    recipients = RecipientSerializer(many=True, max_length=100)


class SharingUpdateSerializer(serializers.Serializer):
    updates = PlantUpdateSerializer(many=True, min_length=1, max_length=100)

    def validate_updates(self, updates):
        ids = [item["plant_id"] for item in updates]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Each plant must appear only once.")
        for item in updates:
            contacts = [recipient["contact_id"] for recipient in item["recipients"]]
            if len(contacts) != len(set(contacts)):
                raise serializers.ValidationError("Each contact must appear only once per plant.")
        return updates
