from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("plant_instances", "0004_plantinstance_water_interval_days"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="PlantCreationRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("creation_key", models.UUIDField()),
                ("request_hash", models.CharField(max_length=64)),
                ("response_data", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("plant", models.OneToOneField(null=True, on_delete=django.db.models.deletion.SET_NULL, to="plant_instances.plantinstance")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("user", "creation_key"), name="plant_creation_user_key_unique")]},
        ),
    ]
