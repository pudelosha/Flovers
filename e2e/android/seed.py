"""Create only synthetic smoke accounts in the explicitly isolated Django service."""
import json
import os
from datetime import timedelta
from io import BytesIO
from pathlib import Path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "e2e.android.settings")
import django  # noqa: E402
django.setup()

from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.core.files.uploadedfile import SimpleUploadedFile  # noqa: E402
from django.utils import timezone  # noqa: E402
from PIL import Image  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402
from locations.models import Location  # noqa: E402
from plant_instances.models import PlantInstance  # noqa: E402
from profiles.models import ProfileSettings, ProfileNotifications  # noqa: E402
from readings.models import AccountSecret, ReadingDevice, Reading  # noqa: E402
from reminders.models import Reminder, ReminderTask  # noqa: E402

PASSWORD = "E2e-only-password-2026"


def assert_isolated():
    if os.environ.get("DJANGO_SETTINGS_MODULE") != "e2e.android.settings":
        raise RuntimeError("Only isolated E2E settings may seed smoke data")
    db = settings.DATABASES["default"]
    if db["ENGINE"] == "django.db.backends.postgresql":
        if db["HOST"] not in {"127.0.0.1", "localhost", "::1"} or db["NAME"] not in {"flovers_ci", "test_flovers_ci"}:
            raise RuntimeError("Only the disposable loopback flovers_ci database may be seeded")
    elif db["ENGINE"] != "django.db.backends.sqlite3" or not (
        db["NAME"] == ":memory:" or (str(db["NAME"]).startswith("file:memorydb_") and "mode=memory" in str(db["NAME"]))
    ):
        raise RuntimeError("Persistent local databases are forbidden")
    if settings.EMAIL_BACKEND != "django.core.mail.backends.locmem.EmailBackend":
        raise RuntimeError("Real SMTP is forbidden")
    if settings.CELERY_BROKER_URL != "memory://" or os.environ.get("FCM_SERVICE_ACCOUNT_PATH"):
        raise RuntimeError("External broker/Firebase is forbidden")


def seed():
    assert_isolated()
    if get_user_model().objects.exists():
        raise RuntimeError("Smoke fixtures require a freshly migrated empty database")
    now = timezone.now()
    for n, email in [(1, "navigation@example.test"), (2, "completion@example.test")]:
        user = get_user_model().objects.create_user(pk=500+n, email=email, password=PASSWORD, is_active=True, first_name="Smoke")
        ProfileSettings.objects.filter(user=user).update(language="en", theme="dark")
        ProfileNotifications.objects.filter(user=user).update(email_daily=False, push_daily=False, timezone="UTC")
        room = Location.objects.create(pk=600+n, user=user, name="Smoke room", category="indoor")
        plant = PlantInstance.objects.create(pk=700+n, user=user, location=room, display_name="Smoke fern", notes="Isolated native smoke fixture")
        reminder = Reminder.objects.create(pk=800+n, user=user, plant=plant, type="water", start_date=now.date(), interval_value=7, interval_unit="days")
        ReminderTask.objects.create(pk=900+n, user=user, reminder=reminder, due_date=now.date(), created_at=now-timedelta(days=1))
        AccountSecret.objects.create(user=user, secret=f"synthetic-e2e-secret-{n}")
        device = ReadingDevice.objects.create(pk=1000+n, user=user, plant=plant, device_name="Smoke board", interval_minutes=60,
            last_read_at=now, sensors={"temperature": True, "humidity": True, "light": True, "moisture": True},
            latest_snapshot={"temperature": 22, "humidity": 45, "light": 200, "moisture": 40})
        Reading.objects.create(device=device, timestamp=now, temperature=22, humidity=45, light=200, moisture=40)
        image = BytesIO(); Image.new("RGB", (240, 320), color=(32, 135, 80)).save(image, "JPEG")
        client = APIClient(); client.force_authenticate(user)
        response = client.put(f"/plant-instances/{plant.pk}/photo/", {
            "photo": SimpleUploadedFile("synthetic.jpg", image.getvalue(), "image/jpeg"),
            "upload_key": f"00000000-0000-4000-8000-{n:012d}", "expected_photo_id": "none",
        }, format="multipart")
        if response.status_code != 200:
            raise RuntimeError(f"Synthetic photo setup failed: {response.status_code} {response.data}")


def verify():
    assert_isolated()
    task = ReminderTask.objects.get(pk=902)
    assert task.status == "completed" and task.completed_by_id == 502
    assert ReminderTask.objects.get(pk=901).status == "pending", "Navigation account must remain untouched"
    assert get_user_model().objects.count() == 2
    assert ReadingDevice.objects.count() == 2
    assert set(get_user_model().objects.values_list("email", flat=True)) == {"navigation@example.test", "completion@example.test"}
    Path("e2e-results/android/backend-verification.json").write_text(json.dumps({
        "completed_task": task.pk, "completed_by": task.completed_by_id,
        "navigation_task_pending": True, "synthetic_accounts": 2,
    }, indent=2))


if __name__ == "__main__":
    import sys
    {"seed": seed, "verify": verify}[sys.argv[1]]()
