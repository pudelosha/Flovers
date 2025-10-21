from django.apps import AppConfig

class ProfilesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "profiles"

    def ready(self) -> None:
        # Import signals so OneToOne rows are auto-created
        from . import signals  # noqa: F401
