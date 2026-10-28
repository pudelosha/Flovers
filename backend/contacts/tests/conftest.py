from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def isolated_contact_throttles():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def people(db):
    users = get_user_model()
    owner = users.objects.create_user(email="owner@example.test", password="contacts-test-password", first_name="Alice", last_name="Owner", is_active=True)
    recipient = users.objects.create_user(email="recipient@example.test", password="contacts-test-password", first_name="Bob", last_name="Recipient", is_active=True)
    outsider = users.objects.create_user(email="outsider@example.test", password="contacts-test-password", first_name="Carol", is_active=True)
    inactive = users.objects.create_user(email="inactive@example.test", password="contacts-test-password", is_active=False)
    clients = []
    for user in (owner, recipient, outsider):
        client = APIClient()
        client.force_authenticate(user=user)
        clients.append(client)
    return SimpleNamespace(owner=owner, recipient=recipient, outsider=outsider, inactive=inactive, a=clients[0], b=clients[1], c=clients[2])
