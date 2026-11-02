import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from profiles.models import ProfileSettings

pytestmark=pytest.mark.django_db

@pytest.fixture
def scene():
 user=get_user_model().objects.create_user(email="theme@example.test",is_active=True)
 client=APIClient();client.force_authenticate(user)
 return user,client

def test_theme_defaults_dark_and_saves_with_existing_settings(scene):
 user,client=scene
 response=client.get(reverse("profile-settings"));assert response.data["data"]["theme"]=="dark"
 response=client.patch(reverse("profile-settings"),{"theme":"dark","background":"bg5","language":"pl"},format="json")
 assert response.status_code==200,response.data
 settings=ProfileSettings.objects.get(user=user)
 assert (settings.theme,settings.background,settings.language)==("dark","bg5","pl")

@pytest.mark.parametrize("theme",["system","bg1",""])
def test_unsupported_theme_never_partially_saves_the_form(scene,theme):
 user,client=scene
 before=ProfileSettings.objects.values().get(user=user)
 response=client.patch(reverse("profile-settings"),{"theme":theme,"language":"pl"},format="json")
 assert response.status_code==400,response.data
 assert ProfileSettings.objects.values().get(user=user)==before

def test_legacy_clients_keep_background_field_compatibility_without_changing_theme(scene):
 user,client=scene
 response=client.patch(reverse("profile-settings"),{"background":"bg2"},format="json")
 assert response.status_code==200,response.data
 assert response.data["data"]["background"]=="bg2" and response.data["data"]["theme"]=="dark"

def test_light_theme_round_trip(scene):
 user,client=scene
 response=client.patch(reverse("profile-settings"),{"theme":"light"},format="json")
 assert response.status_code==200,response.data
 assert client.get(reverse("profile-settings")).data["data"]["theme"]=="light"
 assert ProfileSettings.objects.get(user=user).theme=="light"
