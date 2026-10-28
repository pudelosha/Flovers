import uuid

from django.db import migrations, models


def assign_existing_ids(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    users = User.objects.using(schema_editor.connection.alias)
    for user in users.filter(flovers_id__isnull=True).only("pk").iterator():
        users.filter(pk=user.pk).update(flovers_id=uuid.uuid4())


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_email_case_insensitive_identity")]

    operations = [
        migrations.AddField(
            model_name="user", name="flovers_id",
            field=models.UUIDField(null=True, unique=True, editable=False),
        ),
        migrations.RunPython(assign_existing_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user", name="flovers_id",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
