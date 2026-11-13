from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from sharing.models import PlantShare


def test_summary_follows_shared_plant_access_and_revocation(scene):
    grant = PlantShare.objects.create(plant=scene.plant, recipient=scene.viewer, connection=scene.connection)
    url = reverse("readings-summary-24h")
    assert scene.b.get(url, {"device_id": scene.device.pk}).status_code == 200
    grant.expires_at = timezone.now() - timedelta(seconds=1)
    grant.save()
    assert scene.b.get(url, {"device_id": scene.device.pk}).status_code == 404
