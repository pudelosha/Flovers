from django.conf import settings
from django.db import migrations

def create_defaults_for_existing_users(apps, schema_editor):
    # Resolve swappable user model via apps registry
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)

    ProfileSettings = apps.get_model("profiles", "ProfileSettings")
    ProfileNotifications = apps.get_model("profiles", "ProfileNotifications")

    for user in User.objects.all():
        ProfileSettings.objects.get_or_create(user=user)
        ProfileNotifications.objects.get_or_create(user=user)

class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(create_defaults_for_existing_users, migrations.RunPython.noop),
    ]
