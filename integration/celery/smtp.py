"""Real SMTP transport, restricted to synthetic recipients and local Mailpit."""
from email.utils import parseaddr
from django.core.mail.backends.smtp import EmailBackend


class SyntheticSMTPBackend(EmailBackend):
    def send_messages(self, email_messages):
        if self.host != "127.0.0.1" or self.port != 1025:
            raise RuntimeError("Integration SMTP must be local Mailpit")
        messages = list(email_messages or [])
        for message in messages:
            for recipient in message.recipients():
                address = parseaddr(recipient)[1]
                if not address.lower().endswith(".invalid") or "@" not in address:
                    raise RuntimeError("Integration mail may target only .invalid recipients")
        return super().send_messages(messages)
