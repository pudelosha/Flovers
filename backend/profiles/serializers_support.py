from rest_framework import serializers


class SupportContactSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField(max_length=5000)
    copy_to_user = serializers.BooleanField(required=False, default=True)

    def validate_subject(self, v: str):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Subject is required.")
        return v

    def validate_message(self, v: str):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Message is required.")
        return v


class SupportBugSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=8000)
    copy_to_user = serializers.BooleanField(required=False, default=True)

    def validate_subject(self, v: str):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Subject is required.")
        return v

    def validate_description(self, v: str):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("Description is required.")
        return v
