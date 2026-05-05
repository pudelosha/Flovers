import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_user_string_representation_is_email():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    assert str(user) == "test@example.com"


def test_user_uses_email_as_username_field():
    assert User.USERNAME_FIELD == "email"
    assert User.REQUIRED_FIELDS == []


def test_user_has_no_username_field():
    field_names = [field.name for field in User._meta.fields]

    assert "username" not in field_names
    assert "email" in field_names