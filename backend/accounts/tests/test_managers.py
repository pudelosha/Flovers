import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user_with_email_and_password():
    user = User.objects.create_user(
        email="TEST@Example.COM",
        password="strong-password-123",
    )

    assert user.email == "TEST@example.com"
    assert user.check_password("strong-password-123")
    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_create_user_without_email_raises_error():
    with pytest.raises(ValueError, match="Email must be set"):
        User.objects.create_user(email="", password="strong-password-123")


@pytest.mark.django_db
def test_create_user_without_password_sets_unusable_password():
    user = User.objects.create_user(email="test@example.com")

    assert user.email == "test@example.com"
    assert user.has_usable_password() is False


@pytest.mark.django_db
def test_create_user_defaults_to_not_staff_and_not_superuser():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_create_superuser_sets_staff_superuser_and_active():
    user = User.objects.create_superuser(
        email="admin@example.com",
        password="strong-password-123",
    )

    assert user.email == "admin@example.com"
    assert user.check_password("strong-password-123")
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.is_active is True


@pytest.mark.django_db
def test_create_superuser_requires_is_staff_true():
    with pytest.raises(ValueError, match="Superuser must have"):
        User.objects.create_superuser(
            email="admin@example.com",
            password="strong-password-123",
            is_staff=False,
        )


@pytest.mark.django_db
def test_create_superuser_requires_is_superuser_true():
    with pytest.raises(ValueError, match="Superuser must have"):
        User.objects.create_superuser(
            email="admin@example.com",
            password="strong-password-123",
            is_superuser=False,
        )