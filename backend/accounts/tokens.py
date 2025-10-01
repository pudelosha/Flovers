from django.contrib.auth.tokens import PasswordResetTokenGenerator

activation_token = PasswordResetTokenGenerator()
reset_password_token = PasswordResetTokenGenerator()
