from django.db import migrations, models
from django.db.models.functions import Lower, Trim


def normalize_unique_emails(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    users = User.objects.using(schema_editor.connection.alias)
    conflicts = list(
        users.annotate(canonical=Lower(Trim("email"))).values("canonical")
        .annotate(total=models.Count("id")).filter(total__gt=1)
    )
    if conflicts:
        ids = list(users.annotate(canonical=Lower(Trim("email")))
                   .filter(canonical__in=[row["canonical"] for row in conflicts])
                   .values_list("pk", flat=True)[:30])
        raise RuntimeError(
            "Case-insensitive email collisions exist for account IDs " + str(ids) + ". "
            "Resolve their ownership and assign distinct email addresses before retrying this migration. "
            "No accounts have been merged, deleted, or normalized."
        )
    users.update(email=Lower(Trim("email")))


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]
    operations = [
        migrations.RunPython(normalize_unique_emails, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
        ),
    ]
