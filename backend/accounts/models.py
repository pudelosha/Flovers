import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower
from .managers import UserManager

class User(AbstractUser):
    username = None  # remove username
    email = models.EmailField(unique=True)
    # Public contact identifier, independent of email changes and internal IDs.
    flovers_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta(AbstractUser.Meta):
        abstract = False
        constraints = [models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique")]

    def save(self, *args, **kwargs):
        self.email = UserManager.normalize_email(self.email)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email
