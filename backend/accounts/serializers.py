from django.contrib.auth import get_user_model, password_validation
from django.conf import settings
from django.core.validators import EmailValidator
from django.db import IntegrityError, transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password

from profiles.models import ProfileSettings

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(validators=[EmailValidator()])
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=50)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=50)
    lang = serializers.CharField(required=False, allow_blank=True, max_length=8)

    def validate_email(self, value):
        value = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("Email is already taken."))
        return value

    def validate_lang(self, value: str):
        value = (value or "").strip().lower()
        if not value:
            return "en"
        if "-" in value:
            value = value.split("-", 1)[0]
        allowed = set(settings.SUPPORTED_LANGS)
        return value if value in allowed else "en"

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        lang = validated_data.pop("lang", "en") or "en"

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data.get("first_name", ""),
                    last_name=validated_data.get("last_name", ""),
                    is_active=False,
                )
                ProfileSettings.objects.update_or_create(user=user, defaults={"language": lang})
        except IntegrityError:
            if User.objects.filter(email__iexact=validated_data["email"]).exists():
                raise serializers.ValidationError({"email": _("Email is already taken.")})
            raise

        return user


class PasswordAwareTokenRefreshSerializer(TokenRefreshSerializer):
    """Apply the same password-revocation check to refresh and access tokens."""

    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])
        user_id = refresh.get(api_settings.USER_ID_CLAIM)
        try:
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except (User.DoesNotExist, TypeError, ValueError):
            raise AuthenticationFailed("Invalid refresh token.", code="token_not_valid")
        if not user.is_active:
            raise AuthenticationFailed("Account is inactive.", code="user_inactive")
        if refresh.get(api_settings.REVOKE_TOKEN_CLAIM) != get_md5_hash_password(user.password):
            raise AuthenticationFailed("Password has changed. Please log in again.", code="password_changed")
        return super().validate(attrs)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip()
        password = attrs.get("password")

        try:
            user = User.objects.get(email__iexact=email)
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            raise serializers.ValidationError({"message": _("Invalid credentials.")})

        if not user.check_password(password):
            raise serializers.ValidationError({"message": _("Invalid credentials.")})

        if not user.is_active:
            raise serializers.ValidationError({"message": _("Account is not activated.")})

        attrs["user"] = user
        return attrs


class EmailOnlySerializer(serializers.Serializer):
    email = serializers.EmailField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate(self, attrs):
        user = self.context["request"].user
        current = attrs.get("current_password")
        new = attrs.get("new_password")

        if not user.check_password(current):
            raise serializers.ValidationError({"message": _("Current password is incorrect.")})

        password_validation.validate_password(new, user=user)
        return attrs

class ChangeEmailSerializer(serializers.Serializer):
    new_email = serializers.EmailField(validators=[EmailValidator()])
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        new_email = attrs.get("new_email", "").strip().lower()
        pwd = attrs.get("password")

        if not user.check_password(pwd):
            raise serializers.ValidationError({"message": _("Password is incorrect.")})

        if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError({"message": _("This email is already in use.")})

        attrs["new_email"] = new_email
        return attrs
