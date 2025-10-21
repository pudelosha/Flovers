from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ProfileSettings, ProfileNotifications

User = get_user_model()

@receiver(post_save, sender=User)
def create_profile_related(sender, instance, created, **kwargs):
    if created:
        ProfileSettings.objects.get_or_create(user=instance)
        ProfileNotifications.objects.get_or_create(user=instance)
