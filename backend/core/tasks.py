from celery import shared_task
from django.utils import timezone

@shared_task
def send_watering_reminder(user_id):
    print(f"Reminder for user {user_id} at {timezone.now()}")
