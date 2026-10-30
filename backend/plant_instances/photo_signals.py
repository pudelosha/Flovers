from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import PlantImage
from .photo_storage import queue_photo_deletion


@receiver(post_delete, sender=PlantImage, dispatch_uid="plant_photo_file_cleanup")
def delete_plant_photo_files(sender, instance, **kwargs):
    queue_photo_deletion(instance.directory)
