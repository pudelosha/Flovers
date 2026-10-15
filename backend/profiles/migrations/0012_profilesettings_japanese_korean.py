from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("profiles", "0011_supportmessage_public_sender")]
    operations = [migrations.AlterField(
        model_name="profilesettings",
        name="language",
        field=models.CharField(
            choices=[
                ("en", "English"), ("pl", "Polski"), ("de", "Deutsch"), ("fr", "Français"),
                ("es", "Español"), ("it", "Italiano"), ("pt", "Português"), ("zh", "中文"),
                ("hi", "हिन्दी"), ("ar", "العربية"), ("ja", "日本語"), ("ko", "한국어"),
            ],
            default="en", max_length=5,
        ),
    )]
