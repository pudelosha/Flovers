from django.core.mail import send_mail
from django.conf import settings
from .utils import build_activation_link

def send_activation_email(user):
    link = build_activation_link(user)
    subject = "Confirm your Flovers account"
    body = (
        f"Hi,\n\nThanks for signing up to Flovers!\n\n"
        f"Please confirm your account by clicking the link below:\n{link}\n\n"
        f"If you didn’t request this, you can ignore this email.\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
