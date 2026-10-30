from celery import shared_task

from .photo_storage import cleanup_deleted_files, queue_orphaned_files


@shared_task(ignore_result=True)
def cleanup_private_plant_photos():
    queue_orphaned_files()
    return cleanup_deleted_files()
