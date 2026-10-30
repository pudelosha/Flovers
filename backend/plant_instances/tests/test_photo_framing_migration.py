import uuid

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_existing_private_photo_metadata_survives_framing_migration():
    executor = MigrationExecutor(connection)
    final_targets = executor.loader.graph.leaf_nodes()
    previous_targets = [("plant_instances", "0006_photofiledeletion_photostoragelock_plantimage")]
    previous_targets += [target for target in final_targets if target[0] == "accounts"]
    try:
        executor.migrate(previous_targets)
        old_apps = executor.loader.project_state(previous_targets).apps
        User = old_apps.get_model("accounts", "User")
        Location = old_apps.get_model("locations", "Location")
        Plant = old_apps.get_model("plant_instances", "PlantInstance")
        Photo = old_apps.get_model("plant_instances", "PlantImage")
        owner = User.objects.create(email="photo-migration@example.test", password="unused")
        location = Location.objects.create(user_id=owner.pk, name="Room")
        plant = Plant.objects.create(user_id=owner.pk, location_id=location.pk)
        photo_id, upload_key = uuid.uuid4(), uuid.uuid4()
        directory = f"plants/{plant.pk}/{photo_id.hex}"
        old = Photo.objects.create(id=photo_id, plant_id=plant.pk, upload_key=upload_key,
            directory=directory, width=960, height=1280, byte_size=120000)

        executor = MigrationExecutor(connection)
        executor.migrate(final_targets)
        new_apps = executor.loader.project_state(final_targets).apps
        migrated = new_apps.get_model("plant_instances", "PlantImage").objects.get(pk=photo_id)
        assert migrated.upload_key == upload_key and migrated.directory == directory
        assert (migrated.width, migrated.height, migrated.byte_size) == (960, 1280, 120000)
        assert migrated.created_at == old.created_at
        assert (migrated.focal_x, migrated.focal_y, migrated.zoom, migrated.framing_revision) == (0.5, 0.5, 1, 0)
    finally:
        MigrationExecutor(connection).migrate(final_targets)
