from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings

from .tokens import activation_token

def build_activation_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = activation_token.make_token(user)

    return f"{settings.SITE_URL}/api/auth/activate/?uid={uid}&token={token}"
