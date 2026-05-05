import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from accounts.serializers import (
    RegisterSerializer,
    LoginSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
    ChangeEmailSerializer,
)

User = get_user_model()


@pytest.mark.django_db
def test_register_serializer_accepts_valid_data():
    serializer = RegisterSerializer(data={
        "email": "test@example.com",
        "password": "strong-password-123",
        "first_name": "John",
        "last_name": "Doe",
        "lang": "pl",
    })

    assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
def test_register_serializer_creates_inactive_user():
    serializer = RegisterSerializer(data={
        "email": "test@example.com",
        "password": "strong-password-123",
        "first_name": "John",
        "last_name": "Doe",
        "lang": "pl",
    })

    assert serializer.is_valid(), serializer.errors

    user = serializer.save()

    assert user.email == "test@example.com"
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    assert user.is_active is False
    assert user.check_password("strong-password-123")


@pytest.mark.django_db
def test_register_serializer_rejects_duplicate_email_case_insensitive():
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    serializer = RegisterSerializer(data={
        "email": "TEST@example.com",
        "password": "strong-password-123",
    })

    assert serializer.is_valid() is False
    assert "email" in serializer.errors


@pytest.mark.parametrize(
    "input_lang, expected_lang",
    [
        ("pl", "pl"),
        ("PL", "pl"),
        ("en-US", "en"),
        ("de-DE", "de"),
        ("unknown", "en"),
        ("", "en"),
        (None, "en"),
    ],
)
def test_register_serializer_validate_lang(input_lang, expected_lang):
    serializer = RegisterSerializer()

    assert serializer.validate_lang(input_lang) == expected_lang


@pytest.mark.django_db
def test_register_serializer_rejects_short_password():
    serializer = RegisterSerializer(data={
        "email": "test@example.com",
        "password": "short",
    })

    assert serializer.is_valid() is False
    assert "password" in serializer.errors


@pytest.mark.django_db
def test_login_serializer_accepts_active_user_with_correct_credentials():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=True,
    )

    factory = APIRequestFactory()
    request = factory.post("/login/")

    serializer = LoginSerializer(
        data={
            "email": "test@example.com",
            "password": "strong-password-123",
        },
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["user"] == user


@pytest.mark.django_db
def test_login_serializer_rejects_invalid_credentials():
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=True,
    )

    factory = APIRequestFactory()
    request = factory.post("/login/")

    serializer = LoginSerializer(
        data={
            "email": "test@example.com",
            "password": "wrong-password",
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "message" in serializer.errors


@pytest.mark.django_db
def test_login_serializer_rejects_inactive_user():
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=False,
    )

    factory = APIRequestFactory()
    request = factory.post("/login/")

    serializer = LoginSerializer(
        data={
            "email": "test@example.com",
            "password": "strong-password-123",
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "message" in serializer.errors


def test_reset_password_serializer_rejects_short_password():
    serializer = ResetPasswordSerializer(data={
        "uid": "abc",
        "token": "token",
        "new_password": "short",
    })

    assert serializer.is_valid() is False
    assert "new_password" in serializer.errors


@pytest.mark.django_db
def test_change_password_serializer_accepts_correct_current_password():
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )

    factory = APIRequestFactory()
    request = factory.post("/change-password/")
    request.user = user

    serializer = ChangePasswordSerializer(
        data={
            "current_password": "old-password-123",
            "new_password": "new-password-123",
        },
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
def test_change_password_serializer_rejects_wrong_current_password():
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )

    factory = APIRequestFactory()
    request = factory.post("/change-password/")
    request.user = user

    serializer = ChangePasswordSerializer(
        data={
            "current_password": "wrong-password",
            "new_password": "new-password-123",
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "message" in serializer.errors


@pytest.mark.django_db
def test_change_email_serializer_accepts_valid_email_and_password():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )

    factory = APIRequestFactory()
    request = factory.post("/change-email/")
    request.user = user

    serializer = ChangeEmailSerializer(
        data={
            "new_email": " NEW@Example.COM ",
            "password": "strong-password-123",
        },
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["new_email"] == "new@example.com"


@pytest.mark.django_db
def test_change_email_serializer_rejects_wrong_password():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )

    factory = APIRequestFactory()
    request = factory.post("/change-email/")
    request.user = user

    serializer = ChangeEmailSerializer(
        data={
            "new_email": "new@example.com",
            "password": "wrong-password",
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "message" in serializer.errors


@pytest.mark.django_db
def test_change_email_serializer_rejects_existing_email_case_insensitive():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )
    User.objects.create_user(
        email="taken@example.com",
        password="strong-password-123",
    )

    factory = APIRequestFactory()
    request = factory.post("/change-email/")
    request.user = user

    serializer = ChangeEmailSerializer(
        data={
            "new_email": "TAKEN@example.com",
            "password": "strong-password-123",
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "message" in serializer.errors
