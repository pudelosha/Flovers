from django.contrib.auth import authenticate, get_user_model, password_validation
from django.core.validators import EmailValidator
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from profiles.models import ProfileSettings

User = get_user_model()

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(validators=[EmailValidator()])
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=50)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=50)
    lang = serializers.CharField(required=False, allow_blank=True, max_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("Email is already taken."))
        return value

    def validate_lang(self, value: str):
        value = (value or "").strip().lower()
        if not value:
            return "en"
        # accept "en-US" -> "en"
        if "-" in value:
            value = value.split("-", 1)[0]
        allowed = {"en", "pl", "de", "fr", "es", "it", "pt", "zh", "hi", "ar"}
        return value if value in allowed else "en"

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        lang = validated_data.pop("lang", "en") or "en"

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=False,
        )

        # Create ProfileSettings with selected language
        ProfileSettings.objects.get_or_create(
            user=user,
            defaults={"language": lang},
        )

        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if not user:
            raise serializers.ValidationError({"message": _("Invalid credentials.")})

        if not user.is_active:
            raise serializers.ValidationError({"message": _("Account is not activated.")})

        if not user.is_authenticated:
            raise serializers.ValidationError({"message": _("Authentication failed.")})

        attrs["user"] = user
        return attrs

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value


# --- Change Password ---
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


# --- Change Email ---
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
