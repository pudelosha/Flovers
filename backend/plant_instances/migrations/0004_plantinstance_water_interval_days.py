from django.core.validators import MinValueValidator
from django.db import migrations, models


def backfill_water_intervals(apps, schema_editor):
    Plant = apps.get_model("plant_instances", "PlantInstance")
    Reminder = apps.get_model("reminders", "Reminder")
    db = schema_editor.connection.alias
    for plant in Plant.objects.using(db).all().iterator():
        reminder = Reminder.objects.using(db).filter(
            plant_id=plant.pk, user_id=plant.user_id, type="water", interval_unit="days"
        ).first()
        interval = reminder.interval_value if reminder else plant.moisture_interval_days
        if interval and interval > 0:
            Plant.objects.using(db).filter(pk=plant.pk).update(water_interval_days=interval)


class Migration(migrations.Migration):
    dependencies = [
        ("plant_instances", "0003_backfill_qr_codes"),
        ("reminders", "0003_remindertask_note"),
    ]
    operations = [
        migrations.AddField(
            model_name="plantinstance",
            name="water_interval_days",
            field=models.PositiveSmallIntegerField(blank=True, null=True, validators=[MinValueValidator(1)]),
        ),
        migrations.RunPython(backfill_water_intervals, migrations.RunPython.noop),
    ]
