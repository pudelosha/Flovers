from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0015_indonesian_russian_turkish"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profilesettings",
            name="background",
            field=models.CharField(
                choices=[
                    ("bg1", "Background 1"),
                    ("bg2", "Background 2"),
                    ("bg3", "Background 3"),
                    ("bg4", "Background 4"),
                    ("bg5", "Background 5"),
                ],
                default="bg5",
                max_length=3,
            ),
        ),
    ]
