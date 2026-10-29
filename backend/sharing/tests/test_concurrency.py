from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from rest_framework.test import APIClient

from sharing.models import PlantShare, PlantSharingVersion

from .conftest import put, recipient, update

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.skipif(
    connection.vendor != "postgresql", reason="PostgreSQL row-lock concurrency check",
)]


def test_simultaneous_forms_with_the_same_revision_cannot_overwrite_each_other(scene):
    ready = Barrier(2)

    def save(target):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(get_user_model().objects.get(pk=scene.owner.pk))
            ready.wait(timeout=5)
            return put(client, update(scene.plant, [recipient(target)], revision=0)).status_code
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(save, [scene.viewer, scene.second]))
    assert sorted(responses) == [200, 409]
    assert PlantShare.objects.count() == 1
    assert PlantSharingVersion.objects.get(plant=scene.plant).revision == 1
