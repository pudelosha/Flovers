from django.urls import path
from .views import RegisterView, LoginView, ActivateAccountView, ResendActivationView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/",    LoginView.as_view(), name="login"),
    path("activate/", ActivateAccountView.as_view(), name="activate"),
    path("resend-activation/", ResendActivationView.as_view(), name="resend-activation"),
]
