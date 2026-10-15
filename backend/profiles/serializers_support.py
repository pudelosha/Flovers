from rest_framework import serializers
from django.conf import settings


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


class PublicSupportContactSerializer(SupportContactSerializer):
    email = serializers.EmailField(max_length=254)
    lang = serializers.CharField(required=False, default="en", max_length=8)
    website = serializers.CharField(required=False, default="", allow_blank=True, max_length=200)

    def validate_lang(self, value):
        language = value.strip().lower().split("-", 1)[0]
        return language if language in settings.SUPPORTED_LANGS else settings.EMAIL_DEFAULT_LANG


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
