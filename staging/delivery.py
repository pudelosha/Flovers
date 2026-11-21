from django.core.mail.backends.base import BaseEmailBackend


class DisabledDeliveryBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if email_messages:
            raise RuntimeError("Staging does not send email; fixture consent must remain disabled")
        return 0
