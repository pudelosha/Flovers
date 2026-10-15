from django.contrib.auth.tokens import PasswordResetTokenGenerator

class ActivationTokenGenerator(PasswordResetTokenGenerator):
    key_salt = "accounts.tokens.ActivationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return f"{super()._make_hash_value(user, timestamp)}{user.is_active}"


activation_token = ActivationTokenGenerator()
reset_password_token = PasswordResetTokenGenerator()
