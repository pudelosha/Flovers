from django.db import migrations


def add_popular_plant(apps, schema_editor):
    Definition = apps.get_model("plant_definitions", "PlantDefinition")
    Definition.objects.using(schema_editor.connection.alias).filter(
        latin="Strelitzia alba",
    ).update(popular=True)


class Migration(migrations.Migration):
    dependencies = [("plant_definitions", "0005_reviewed_catalogue_corrections")]
    operations = [migrations.RunPython(add_popular_plant, migrations.RunPython.noop)]
