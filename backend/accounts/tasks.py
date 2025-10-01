from celery import shared_task
from django.contrib.auth import get_user_model
from .emails import send_activation_email, send_password_reset_email

User = get_user_model()

@shared_task
def send_activation_email_task(user_id: int):
    user = User.objects.get(pk=user_id)
    send_activation_email(user)

@shared_task
def send_password_reset_email_task(user_id: int):
    user = User.objects.get(pk=user_id)
    send_password_reset_email(user)