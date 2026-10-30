from django.apps import AppConfig

class PlantInstancesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "plant_instances"

    def ready(self):
        from . import photo_signals  # noqa: F401
