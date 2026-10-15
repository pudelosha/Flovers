from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0010_alter_profilesettings_background"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [migrations.AlterField(
        model_name="supportmessage", name="user",
        field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                related_name="support_messages", to=settings.AUTH_USER_MODEL),
    )]
