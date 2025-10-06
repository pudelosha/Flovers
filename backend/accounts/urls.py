from django.urls import path
from .views import (
    RegisterView, LoginView, ActivateAccountView,
    ResendActivationView, ForgotPasswordView, ResetPasswordView,
)
from .views_open import open_activate, open_reset_password  # NEW

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/",    LoginView.as_view(), name="login"),
    path("activate/", ActivateAccountView.as_view(), name="activate"),
    path("resend-activation/", ResendActivationView.as_view(), name="resend-activation"),
    path("forgot-password/",   ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/",    ResetPasswordView.as_view(), name="reset-password"),

    # Web fallback pages that immediately try to open the app
    path("open/activate/", open_activate, name="open-activate"),
    path("open/reset-password/", open_reset_password, name="open-reset-password"),
]
