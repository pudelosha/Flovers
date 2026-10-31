from django.conf import settings
from rest_framework import serializers


class InvitationSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254, trim_whitespace=True)


class ContactNameSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, trim_whitespace=True)


class EmailInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    language = serializers.ChoiceField(choices=settings.SUPPORTED_LANGS)
