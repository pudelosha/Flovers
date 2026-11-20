"""Commands run inside the exact application image, against disposable PostgreSQL only."""
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import uuid
from datetime import date, datetime, timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "staging.settings")
import django  # noqa: E402
django.setup()
from django.apps import apps as current_apps  # noqa: E402
from django.conf import settings  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.core.serializers.json import DjangoJSONEncoder  # noqa: E402
from django.db import connection, IntegrityError, transaction  # noqa: E402
from django.db.migrations.executor import MigrationExecutor  # noqa: E402
from django.db.migrations.recorder import MigrationRecorder  # noqa: E402

STATE = Path("/state")
RESULTS = Path("/results")
FIXED = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)
APPLICATIONS = {"accounts", "profiles", "contacts", "sharing", "locations",
                "plant_definitions", "plant_instances", "reminders", "readings"}
MEDIA_TARGETS = {
    "accounts": "0003_user_flovers_id", "contacts": "0002_emailinvitation",
    "sharing": "0002_sharedcarenotification", "locations": "0001_initial",
    "plant_definitions": "0004_pruning_support", "plant_instances": "0008_journal_photos",
    "profiles": "0021_inboxnotification", "readings": "0009_reading_intervals_and_missing_alerts",
    "reminders": "0008_remindertask_completion_undo",
}


def isolated():
    assert settings.SETTINGS_MODULE == "staging.settings"
    assert connection.vendor == "postgresql" and connection.settings_dict["NAME"] == "flovers_stage"
    assert connection.settings_dict["HOST"] == "postgres"
    for root in [settings.MEDIA_ROOT, settings.PRIVATE_MEDIA_ROOT, settings.STATIC_ROOT, STATE]:
        assert Path(root).stat().st_uid == os.getuid() == 10001, f"Unexpected disposable volume owner: {root}"


def save(path, data):
    path.write_text(json.dumps(data, cls=DjangoJSONEncoder, sort_keys=True, indent=2), encoding="utf8")


def load(name):
    return json.loads((STATE / name).read_text(encoding="utf8"))


def migrate_to(targets):
    executor = MigrationExecutor(connection)
    requested = [(app, targets.get(app)) for app in sorted(APPLICATIONS)]
    requested += [node for node in executor.loader.graph.leaf_nodes() if node[0] not in APPLICATIONS]
    plan = executor.migration_plan(requested)
    assert not any(backwards for _, backwards in plan), "Only forward migration rehearsal is permitted"
    print("Forward checkpoint:", json.dumps([list(migration.key) if hasattr(migration, "key") else
        [migration.app_label, migration.name] for migration, _ in plan]), flush=True)
    executor.migrate(requested)
    return executor.loader.project_state([node for node in requested if node[1] is not None]).apps


def snapshot(registry):
    """Every existing application PK and row, with explicitly mutable migration fields excluded."""
    records = {}
    allowed_changes = {
        "profiles.profilesettings": {"background"},
        "reminders.remindertask": {"completed_by_id"},
    }
    for model in registry.get_models():
        if model._meta.app_label not in APPLICATIONS or not model._meta.managed:
            continue
        fields = [field.attname for field in model._meta.local_fields
                  if field.attname not in allowed_changes.get(model._meta.label_lower, set())]
        records[model._meta.label_lower] = {
            "fields": fields,
            "rows": list(model.objects.order_by(model._meta.pk.name).values(*fields)),
        }
    return json.loads(json.dumps(records, cls=DjangoJSONEncoder))


def assert_preserved(expected, additions=None):
    additions = additions or {}
    for label, previous in expected.items():
        model = current_apps.get_model(label)
        rows = model.objects.exclude(pk__in=additions.get(label, []))
        actual = list(rows.order_by(model._meta.pk.name).values(*previous["fields"]))
        actual = json.loads(json.dumps(actual, cls=DjangoJSONEncoder))
        assert actual == previous["rows"], f"Unexpected row/relationship changes: {label}"


def jpeg(path, size=(240, 320)):
    from PIL import Image
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color=(35, 130, 80)).save(path, "JPEG", quality=70)
    path.chmod(0o600)


def legacy():
    assert not MigrationRecorder(connection).applied_migrations(), "Fixture requires a new empty database"
    baseline = json.loads(Path(__file__).with_name("schema_baseline.json").read_text(encoding="utf8"))
    for filename, expected in baseline["files_sha256"].items():
        path = Path(settings.BASE_DIR) / filename.removeprefix("backend/")
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, filename
    registry = migrate_to(baseline["targets"])
    expected_nodes = {tuple(p.split("/")[1:2] + [Path(p).stem]) for p in baseline["files_sha256"]}
    applied = set(MigrationRecorder(connection).applied_migrations())
    assert {node for node in applied if node[0] in APPLICATIONS} == expected_nodes
    get = registry.get_model
    for pk, name in [(501, "Owner"), (502, "Caregiver"), (503, "Other")]:
        get("accounts", "User").objects.create(pk=pk, email=f"{name.lower()}@example.test",
            password="!unusable-synthetic-password", first_name=name, is_active=True, date_joined=FIXED)
        get("profiles", "ProfileSettings").objects.create(user_id=pk, language="en", background="bg1")
        get("profiles", "ProfileNotifications").objects.create(user_id=pk, email_daily=False, push_daily=False)
    get("profiles", "AccountProgression").objects.create(user_id=501, total_xp=75)
    get("locations", "Location").objects.create(pk=601, user_id=501, name="Staging room", category="indoor")
    get("plant_definitions", "PlantDefinition").objects.create(pk=91, external_id="staging-synthetic-fern",
        name="Synthetic fern", latin="Staging synthetic fern", sun="medium", water="medium", difficulty="easy",
        popular=True, image_thumb="plants/thumb/staging.jpg", image_hero="plants/hero/staging.jpg",
        recommended_pot_materials=["plastic"], recommended_soil_mixes=["universal"],
        water_interval_days=9, traits=[])
    get("plant_definitions", "PlantDefinitionTranslation").objects.create(plant_definition_id=91,
        language_code="en", common_name="Synthetic fern", description="Disposable migration fixture.")
    get("plant_instances", "PlantInstance").objects.create(pk=701, user_id=501, location_id=601,
        plant_definition_id=91, display_name="Synthetic fern", notes="Keep this private migration note.",
        qr_code="staging-qr-701", water_interval_days=9, purchase_date=date(2026, 5, 2))
    get("reminders", "Reminder").objects.create(pk=801, user_id=501, plant_id=701, type="water",
        start_date=date(2026, 11, 1), interval_value=7, interval_unit="days")
    task = get("reminders", "ReminderTask")
    task.objects.create(pk=901, user_id=501, reminder_id=801, due_date=date(2026, 11, 25), note="Pending note")
    task.objects.create(pk=902, user_id=501, reminder_id=801, due_date=date(2026, 11, 1),
        status="completed", completed_at=FIXED, note="Completed note",
        completed_event={"plant_id": 701, "type": "water", "plant_name": "Synthetic fern",
                         "location_name": "Staging room", "interval_value": 7, "interval_unit": "days",
                         "start_date": "2026-11-01"})
    get("profiles", "TaskXPAward").objects.create(user_id=501, source_task_id=902, plant_id=701,
        care_type="water", earned_on=date(2026, 11, 1), xp=75, reason="awarded")
    get("readings", "AccountSecret").objects.create(user_id=501, secret="synthetic-staging-device-secret")
    get("readings", "ReadingDevice").objects.create(pk=1001, user_id=501, plant_id=701,
        device_name="Staging board", device_key="STAGE0001", interval_hours=2, last_read_at=FIXED,
        latest_snapshot={"temperature": 23, "moisture": 40}, sensors={"temperature": True, "moisture": True})
    get("readings", "Reading").objects.create(pk=1201, device_id=1001, timestamp=FIXED, observed_at=FIXED,
        temperature=23, humidity=45, light=200, moisture=40)
    get("readings", "PumpTask").objects.create(pk=1101, device_id=1001, source="manual",
        status="executed", executed_at=FIXED, created_by_user_id=501, duration_seconds=20)
    jpeg(Path(settings.MEDIA_ROOT) / "plants/thumb/staging.jpg", (64, 64))
    jpeg(Path(settings.MEDIA_ROOT) / "plants/hero/staging.jpg")
    save(STATE / "legacy.json", snapshot(registry))
    save(RESULTS / "legacy-schema.json", {"source_commit": baseline["commit"],
        "application_migrations": len(expected_nodes), "applied_migrations": len(applied),
        "accounts": 3, "plants": 1, "tasks": 2, "readings": 1, "schema": "previous-supported"})


def media_checkpoint():
    registry = migrate_to(MEDIA_TARGETS)
    assert_preserved(load("legacy.json"))
    get = registry.get_model
    get("contacts", "Connection").objects.create(pk=401, user_low_id=501, user_high_id=502,
        initiator_id=501, status="accepted", accepted_at=FIXED)
    get("sharing", "PlantShare").objects.create(pk=301, plant_id=701, recipient_id=502,
        connection_id=401, can_complete_tasks=False)
    # One old sent receipt exercises inbox backfill, without sending a message.
    get("profiles", "NotificationDeliveryLog").objects.create(pk=201, user_id=501,
        channel="email", kind="due_today", local_date=date(2026, 11, 1), status="sent", sent_at=FIXED)
    entry_id = uuid.UUID("00000000-0000-4000-8000-000000000801")
    get("plant_instances", "JournalPhotoEntry").objects.create(pk=entry_id, plant_id=701,
        taken_on=date(2026, 11, 1), notes="Historical journal photo", created_at=FIXED)
    for n, purpose in [(1, "cover"), (2, "journal")]:
        photo_id = uuid.UUID(f"00000000-0000-4000-8000-{n:012d}")
        directory = f"plants/701/{photo_id.hex}"
        for variant, size in [("display", (240, 320)), ("thumbnail", (64, 64))]:
            jpeg(Path(settings.PRIVATE_MEDIA_ROOT) / directory / f"{variant}.jpg", size)
        get("plant_instances", "PlantImage").objects.create(pk=photo_id, plant_id=701,
            journal_entry_id=entry_id if purpose == "journal" else None, purpose=purpose,
            upload_key=photo_id, directory=directory, width=240, height=320,
            byte_size=sum(p.stat().st_size for p in (Path(settings.PRIVATE_MEDIA_ROOT) / directory).glob("*.jpg")),
            focal_x=0.4, focal_y=0.6, zoom=1.2)
    # A metadata reference whose bytes were lost before this deployment must return a safe 404.
    missing_entry = uuid.UUID("00000000-0000-4000-8000-000000000802")
    missing_image = uuid.UUID("00000000-0000-4000-8000-000000000003")
    get("plant_instances", "JournalPhotoEntry").objects.create(pk=missing_entry, plant_id=701, notes="Missing synthetic file")
    get("plant_instances", "PlantImage").objects.create(pk=missing_image, plant_id=701,
        journal_entry_id=missing_entry, purpose="journal", upload_key=missing_image,
        directory=f"plants/701/{missing_image.hex}", width=240, height=320, byte_size=1700)
    save(STATE / "media-checkpoint.json", snapshot(registry))
    save(STATE / "media-files.json", media_files())
    save(RESULTS / "media-checkpoint.json", {"targets": MEDIA_TARGETS,
        "existing_files": len(media_files()), "cover_photos": 1, "journal_photos": 1,
        "missing_photo_references": 1})


def media_files():
    files = {}
    for root in (Path(settings.MEDIA_ROOT), Path(settings.PRIVATE_MEDIA_ROOT)):
        for path in sorted(root.rglob("*.jpg")):
            files[str(path)] = {"sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                               "mode": stat.S_IMODE(path.stat().st_mode)}
    return files


def forward():
    call_command("migrate", interactive=False, verbosity=1)
    from reminders.models import ReminderTask
    from readings.models import ReadingDevice
    from profiles.models import InboxNotification
    inbox = InboxNotification.objects.get(user_id=501, event_key="daily:201", channel="email")
    assert_preserved(load("legacy.json"), {"profiles.notificationdeliverylog": [201]})
    assert_preserved(load("media-checkpoint.json"), {"profiles.inboxnotification": [inbox.pk]})
    assert ReminderTask.objects.get(pk=902).completed_by_id == 501
    assert ReadingDevice.objects.get(pk=1001).interval_minutes == 120
    assert InboxNotification.objects.count() == 1
    assert media_files() == load("media-files.json")
    assert not MigrationExecutor(connection).migration_plan(MigrationExecutor(connection).loader.graph.leaf_nodes())
    save(RESULTS / "migration-verification.json", {"legacy_records_preserved": True,
        "media_checkpoint_records_preserved": True, "completed_by_backfilled": 501,
        "reading_interval_minutes": 120, "inbox_backfill_count": 1,
        "applied_migrations": len(MigrationRecorder(connection).applied_migrations())})
    import ast
    inventory = []
    for path in sorted(Path(settings.BASE_DIR).glob("*/migrations/0*.py")):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8-sig"))):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "RunPython":
                reverse = next((kw.value for kw in node.keywords if kw.arg == "reverse_code"),
                               node.args[1] if len(node.args) > 1 else None)
                inventory.append({"migration": path.relative_to(settings.BASE_DIR).as_posix(),
                    "reverse_code": ast.unparse(reverse) if reverse else None,
                    "data_restore_required": reverse is None or ast.unparse(reverse).endswith("RunPython.noop")})
    save(RESULTS / "migration-risk-inventory.json", inventory)
    from rest_framework_simplejwt.tokens import AccessToken
    from accounts.models import User
    save(STATE / "tokens.json", {str(pk): str(AccessToken.for_user(User.objects.get(pk=pk))) for pk in [501, 502, 503]})


def constraints():
    inspected = 0
    with connection.cursor() as cursor:
        for model in current_apps.get_models():
            if model._meta.app_label not in APPLICATIONS:
                continue
            actual = connection.introspection.get_constraints(cursor, model._meta.db_table)
            for item in [*model._meta.constraints, *model._meta.indexes]:
                assert item.name in actual, (model._meta.label, item.name)
                inspected += 1
        cursor.execute("SELECT count(*) FROM pg_index WHERE NOT indisvalid")
        assert cursor.fetchone() == (0,)
        cursor.execute("SELECT count(*) FROM pg_constraint WHERE NOT convalidated")
        assert cursor.fetchone() == (0,)
    from plant_instances.models import PlantImage
    from reminders.models import ReminderTask
    # Exercise real partial unique/check constraints, not only their names.
    for operation in [
        lambda: ReminderTask.objects.create(user_id=501, reminder_id=801, due_date=date(2026, 11, 26)),
        lambda: PlantImage.objects.filter(purpose="cover").update(focal_x=2),
    ]:
        try:
            with transaction.atomic():
                operation()
        except IntegrityError:
            pass
        else:
            raise AssertionError("Required database constraint accepted invalid data")
    save(RESULTS / "constraints.json", {"declared_constraints_and_indexes": inspected,
        "invalid_indexes": 0, "unvalidated_constraints": 0, "rejected_invalid_writes": 2})


def idempotent():
    before = snapshot(current_apps)
    call_command("migrate", interactive=False, verbosity=1)
    assert snapshot(current_apps) == before
    assert media_files() == load("media-files.json")
    save(RESULTS / "idempotent.json", {"second_migrate_no_changes": True})


def readonly():
    from deployment.read_only_smoke import check
    before = snapshot(current_apps)
    result = check("http://web:8000", load("tokens.json")["501"],
                   allow_disposable_http=True, staging_readiness=True)
    assert snapshot(current_apps) == before, "Read-only smoke modified application rows"
    result["application_rows_unchanged"] = True
    save(RESULTS / "read-only-smoke.json", result)


def http(path, user=None, expected=200, binary=False):
    from urllib.request import Request, build_opener, ProxyHandler
    from urllib.error import HTTPError
    from deployment.read_only_smoke import NoRedirects
    headers = {"Authorization": "Bearer " + load("tokens.json")[str(user)]} if user else {}
    try:
        response = build_opener(ProxyHandler({}), NoRedirects()).open(
            Request("http://web:8000" + path, headers=headers, method="GET"), timeout=8)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == expected, (path, response.status, expected)
        body = response.read(8 * 1024 * 1024)
        if binary:
            assert response.headers["Cache-Control"] == "private, no-store"
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert response.headers["Content-Type"].startswith("image/jpeg")
            return body
        if expected >= 500:
            assert b"Traceback" not in body and b"synthetic-only" not in body and b"OperationalError" not in body
            return body
        return json.loads(body)


def api():
    http("/__staging__/live/")
    assert http("/__staging__/ready/")["checks"] == {"database": True, "redis": True}
    http("/plant-instances/701/", expected=401)
    for user in [501, 502]:
        assert http("/plant-instances/701/", user)["id"] == 701
    http("/plant-instances/701/", 503, expected=404)
    assert http("/locations/", 502) == []
    assert http("/locations/", 501)[0]["name"] == "Staging room"
    save(RESULTS / "api-verification.json", {"live_and_ready": True,
        "anonymous_denied": 401, "unrelated_account_denied": 404,
        "shared_read_allowed": True, "private_locations_isolated": True})


def media():
    from plant_instances.models import PlantImage
    from plant_instances.photo_storage import directory_path
    assert media_files() == load("media-files.json"), "Media content/permissions changed during deployment"
    good = missing = 0
    for image in PlantImage.objects.order_by("id"):
        path = directory_path(image.directory)
        assert path.is_relative_to(Path(settings.PRIVATE_MEDIA_ROOT))
        url = f"/plant-instances/701/photo/{image.pk}/"
        for variant in ["display", "thumbnail"]:
            file = path / (variant + ".jpg")
            if file.is_file():
                for user in [501, 502]:
                    assert http(url + "?variant=" + variant, user, binary=True) == file.read_bytes()
                good += 1
            else:
                http(url + "?variant=" + variant, 501, expected=404)
                missing += 1
        http(url, expected=401)
        http(url, 503, expected=404)
    journal = http("/journal/photos/?plant_id=701", 501)["results"]
    assert len(journal) == 2 and all(row["photo"]["url"].startswith("/plant-instances/701/photo/") for row in journal)
    assert stat.S_IMODE(Path(settings.PRIVATE_MEDIA_ROOT).stat().st_mode) == 0o700
    assert good == 4 and missing == 2
    save(RESULTS / "media-verification.json", {"files_preserved": len(media_files()),
        "readable_private_variants": good, "missing_variant_safe_404": missing,
        "owner_and_shared_reader": True, "anonymous_and_outsider_denied": True,
        "journal_references_valid": True, "private_root_mode": "0700"})


def celery():
    from app.celery import celery_app
    from .tasks import heartbeat
    from redis import Redis
    assert settings.CELERY_TASK_ALWAYS_EAGER is False
    registered = celery_app.control.inspect(destination=["staging@worker"], timeout=5).registered()
    names = registered["staging@worker"]
    assert "staging.tasks.heartbeat" in names and "contacts.tasks.deliver_invitation_emails" in names
    # The marker exists before our explicit task, proving Beat dispatched it.
    marker = Redis.from_url(settings.CELERY_RESULT_BACKEND).get(f"staging:{settings.RUN}:heartbeat")
    assert marker, "Beat scheduling has not initialized"
    result = heartbeat.delay().get(timeout=15)
    assert result["db"] == 1 and result["run"] == settings.RUN
    save(RESULTS / "celery-verification.json", {"non_eager_execution": True,
        "worker_registered": True, "beat_dispatched": True, "database_visible": True})


def failure():
    role = sys.argv[2]
    assert role in {"postgres", "redis"}
    expected_key = "database" if role == "postgres" else "redis"
    # These probes deliberately remain usable with an unavailable dependency.
    assert http("/__staging__/live/") == {"status": "alive"}
    body = http("/__staging__/ready/", expected=503)
    assert b'"' + expected_key.encode() + b'": false' in body
    http("/locations/", 501, expected=500)
    from deployment.read_only_smoke import check, SmokeError
    try:
        check("http://web:8000", load("tokens.json")["501"], timeout=6,
              allow_disposable_http=True, staging_readiness=True)
    except SmokeError:
        pass
    else:
        raise AssertionError("Read-only smoke accepted an unavailable dependency")
    save(RESULTS / f"outage-{role}.json", {"liveness": 200, "readiness": 503,
        "api_error_sanitized": 500, "read_only_smoke_failed_closed": True})


def isolation():
    import socket
    from .delivery import DisabledDeliveryBackend
    try:
        socket.getaddrinfo("forbidden.example.invalid", 443)
    except OSError as error:
        assert "before DNS" in str(error)
    else:
        raise AssertionError("External name resolution was permitted")
    try:
        DisabledDeliveryBackend().send_messages([object()])
    except RuntimeError:
        pass
    else:
        raise AssertionError("External delivery was permitted")
    save(RESULTS / "isolation.json", {"external_host_denied_before_dns": True,
        "email_delivery_rejected": True, "firebase_credentials": False,
        "persistent_private_mount": Path(settings.PRIVATE_MEDIA_ROOT).is_mount()})


if __name__ == "__main__":
    isolated()
    commands = {function.__name__: function for function in [legacy, media_checkpoint, forward,
        constraints, idempotent, readonly, api, media, celery, failure, isolation]}
    commands[sys.argv[1]]()
