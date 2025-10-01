from django.core.mail import send_mail
from django.conf import settings
from .utils import build_activation_link, build_password_reset_link

def send_activation_email(user):
    link = build_activation_link(user)
    subject = "Confirm your Flovers account"
    body = (
        f"Hi,\n\nThanks for signing up to Flovers!\n\n"
        f"Please confirm your account by clicking the link below:\n{link}\n\n"
        f"If you didn’t request this, you can ignore this email.\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)

def send_password_reset_email(user):
    link = build_password_reset_link(user)
    subject = "Reset your Flovers password"
    body = (
        "Hi,\n\nWe received a request to reset your password.\n\n"
        f"Reset it using the link below:\n{link}\n\n"
        "If you didn’t request this, you can ignore this email.\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)