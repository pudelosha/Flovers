from django.core.mail import send_mail
from django.conf import settings

def send_device_code_email(*, user, device, code_text: str):
    subject = f"[Flovers] Device code for '{device.device_name}'"
    body = (
        f"Hi,\n\nHere is the generated code for your device '{device.device_name}'.\n\n"
        "Copy/paste this into your Arduino/ESP project and adjust WiFi & sensor code as needed.\n\n"
        "----- BEGIN CODE -----\n"
        f"{code_text}\n"
        "-----  END  CODE -----\n\n"
        "If you rotate your account secret or change the device, re-generate this code.\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
