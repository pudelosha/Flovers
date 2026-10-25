from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    dependencies = [("readings", "0007_reading_observation_and_pump_safety")]
    operations = [
        migrations.AddField(
            model_name="readingdevice", name="supports_manual_duration",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="pumptask", name="duration_seconds",
            field=models.PositiveSmallIntegerField(
                null=True, blank=True,
                validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(300)],
            ),
        ),
    ]
