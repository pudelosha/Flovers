from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("plant_instances", "0006_photofiledeletion_photostoragelock_plantimage")]

    operations = [
        migrations.AddField(model_name="plantimage", name="focal_x",
            field=models.FloatField(default=0.5, validators=[MinValueValidator(0), MaxValueValidator(1)])),
        migrations.AddField(model_name="plantimage", name="focal_y",
            field=models.FloatField(default=0.5, validators=[MinValueValidator(0), MaxValueValidator(1)])),
        migrations.AddField(model_name="plantimage", name="zoom",
            field=models.FloatField(default=1, validators=[MinValueValidator(1), MaxValueValidator(4)])),
        migrations.AddField(model_name="plantimage", name="framing_revision",
            field=models.PositiveIntegerField(default=0)),
        migrations.AddConstraint(model_name="plantimage",
            constraint=models.CheckConstraint(condition=models.Q(focal_x__gte=0, focal_x__lte=1,
                focal_y__gte=0, focal_y__lte=1, zoom__gte=1, zoom__lte=4), name="plant_photo_framing_bounds")),
    ]
