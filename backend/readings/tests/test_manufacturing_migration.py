"""Historical public identity remains intact across the inventory migration."""
import base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_inventory_upgrade_preserves_legacy_identity():
    executor = MigrationExecutor(connection)
    support = [n for n in executor.loader.graph.leaf_nodes() if n[0] != "readings"]
    before = support + [("readings", "0011_physical_device_foundations")]
    after = support + [("readings", "0012_manufacturing_inventory")]
    executor.migrate(before)
    try:
        apps = executor.loader.project_state(before).apps
        public = base64.b64encode(Ed25519PrivateKey.generate().public_key().public_bytes_raw()).decode()
        old = apps.get_model("readings", "PhysicalDevice").objects.create(hardware_id="SYNTHETIC_LEGACY_01",
            bootstrap_public_key=public, provisioning_pop_digest="a" * 64,
            hardware_profile="esp32-c3-existing", hardware_revision="1", binding_generation=3, firmware_version="existing")
        executor = MigrationExecutor(connection); executor.migrate(after)
        model = executor.loader.project_state(after).apps.get_model("readings", "PhysicalDevice")
        current = model.objects.get(pk=old.pk)
        assert current.bootstrap_public_key == public and current.provisioning_pop_digest == "a" * 64
        assert current.binding_generation == 3 and current.firmware_version == "existing"
        assert current.manufacturing_batch_id is None and current.serial_number is None
        assert current.factory_receipt == {} and current.disabled is False
        assert model.objects.count() == 1
    finally:
        executor = MigrationExecutor(connection); executor.migrate(executor.loader.graph.leaf_nodes())
