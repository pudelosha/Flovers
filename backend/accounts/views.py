from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer, LoginSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, ChangeEmailSerializer,   # NEW
)
from .tokens import activation_token, reset_password_token
from .emails import send_activation_email
from .tasks import send_activation_email_task, send_password_reset_email_task

User = get_user_model()

def ok(message: str, data: dict | None = None, code=status.HTTP_200_OK):
    return Response({"status": "success", "message": message, "data": data or {}}, status=code)

def fail(message: str, errors: dict | None = None, code=status.HTTP_400_BAD_REQUEST):
    payload = {"status": "error", "message": message}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=code)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        if not ser.is_valid():
            return fail("Registration failed.", ser.errors)
        user = ser.save()
        try:
            send_activation_email_task.delay(user.id)
        except Exception:
            send_activation_email(user)
        return ok("Account created. Please check your email to activate your account.", code=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        ser = LoginSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            msg = ser.errors.get("message", ["Login failed."])[0]
            return fail(msg, errors=ser.errors)
        user = ser.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {"id": user.id, "email": user.email, "first_name": user.first_name, "last_name": user.last_name},
        }
        return ok("Login successful.", data)

class ActivateAccountView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        uidb64 = request.query_params.get("uid")
        token = request.query_params.get("token")
        if not uidb64 or not token:
            return fail("Activation link is invalid.", code=status.HTTP_400_BAD_REQUEST)
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return fail("Activation link is invalid or expired.", code=status.HTTP_400_BAD_REQUEST)
        if user.is_active:
            return ok("Account already activated.")
        if activation_token.check_token(user, token):
            user.is_active = True
            user.save(update_fields=["is_active"])
            return ok("Account activated successfully.")
        return fail("Activation token is invalid or expired.", code=status.HTTP_400_BAD_REQUEST)

class ResendActivationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return fail("Email is required.", code=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return ok("If the account exists and is not activated, an email has been sent.")
        if user.is_active:
            return ok("Account is already activated.")
        try:
            send_activation_email_task.delay(user.id)
        except Exception:
            send_activation_email(user)
        return ok("Activation email resent.")

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        ser = ForgotPasswordSerializer(data=request.data)
        if not ser.is_valid():
            return fail("Please provide a valid email address.", ser.errors)
        email = ser.validated_data["email"].strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return ok("If an account exists for this email, a reset link has been sent.")
        if not user.is_active:
            return ok("If an account exists for this email, a reset link has been sent.")
        try:
            send_password_reset_email_task.delay(user.id)
        except Exception:
            from .emails import send_password_reset_email
            send_password_reset_email(user)
        return ok("If an account exists for this email, a reset link has been sent.")

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        ser = ResetPasswordSerializer(data=request.data)
        if not ser.is_valid():
            return fail("Password reset failed.", ser.errors)

        uidb64 = ser.validated_data["uid"]
        token = ser.validated_data["token"]
        new_password = ser.validated_data["new_password"]

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return fail("Reset link is invalid.", code=status.HTTP_400_BAD_REQUEST)

        if not reset_password_token.check_token(user, token):
            return fail("Reset token is invalid or expired.", code=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return ok("Password has been reset successfully.")


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return fail("Unable to change password.", ser.errors)
        user = request.user
        user.set_password(ser.validated_data["new_password"])
        user.save(update_fields=["password"])
        return ok("Password updated successfully.")


class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        ser = ChangeEmailSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return fail("Unable to change email.", ser.errors)
        user = request.user
        user.email = ser.validated_data["new_email"]
        user.save(update_fields=["email"])
        # Optional: send a notification or re-verify new email later
        return ok("Email updated successfully.", {"email": user.email})
