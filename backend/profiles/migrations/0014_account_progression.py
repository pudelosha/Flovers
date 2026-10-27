import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("profiles", "0013_notification_delivery_outbox"),
    ]

    operations = [
        migrations.CreateModel(
            name="AccountProgression",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("total_xp", models.PositiveIntegerField(default=0, validators=[django.core.validators.MaxValueValidator(194625)])),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="account_progression", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "constraints": [models.CheckConstraint(condition=models.Q(total_xp__lte=194625), name="account_xp_at_most_max_level")],
            },
        ),
        migrations.CreateModel(
            name="TaskXPAward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_task_id", models.PositiveBigIntegerField(unique=True)),
                ("plant_id", models.PositiveBigIntegerField()),
                ("care_type", models.CharField(max_length=16)),
                ("earned_on", models.DateField()),
                ("xp", models.PositiveSmallIntegerField(default=0, validators=[django.core.validators.MaxValueValidator(100)])),
                ("reason", models.CharField(choices=[
                    ("awarded", "Awarded"), ("early", "Task was not due"),
                    ("plant_care_daily_limit", "Plant care already rewarded today"),
                    ("daily_cap", "Daily cap reached"), ("level_cap", "Maximum level reached"),
                ], max_length=24)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="task_xp_awards", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "indexes": [models.Index(fields=["user", "earned_on"], name="task_xp_user_day_idx")],
                "constraints": [
                    models.UniqueConstraint(fields=["user", "plant_id", "care_type", "earned_on"], condition=models.Q(xp__gt=0), name="xp_one_plant_care_per_day"),
                    models.CheckConstraint(condition=models.Q(xp__lte=100), name="task_xp_at_most_first_reward"),
                ],
            },
        ),
    ]
