from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0017_profilenotifications_shared_task_email_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="profilenotifications",
            name="email_shared_due",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profilenotifications",
            name="push_shared_due",
            field=models.BooleanField(default=False),
        ),
    ]
