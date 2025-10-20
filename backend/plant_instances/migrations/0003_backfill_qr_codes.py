from django.db import migrations
import secrets

def backfill_qr(apps, schema_editor):
    PlantInstance = apps.get_model("plant_instances", "PlantInstance")
    # Only plants missing a QR code
    for plant in PlantInstance.objects.filter(qr_code__isnull=True).iterator():
        plant.qr_code = secrets.token_urlsafe(18)
        plant.save(update_fields=["qr_code"])

class Migration(migrations.Migration):

    dependencies = [
        ("plant_instances", "0002_plantinstance_qr_code"),
    ]

    operations = [
        migrations.RunPython(backfill_qr, migrations.RunPython.noop),
    ]
