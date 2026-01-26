from __future__ import annotations

import logging

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status

from core.emailing import send_templated_email
from .models import SupportMessage
from .views import ok, err  # reuse your ok/err helpers
from .serializers_support import SupportContactSerializer, SupportBugSerializer

logger = logging.getLogger(__name__)


def _get_user_lang(user) -> str:
    default = getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en"
    try:
        ps = getattr(user, "profile_settings", None)
        if ps and getattr(ps, "language", None):
            lang = str(ps.language).strip().lower()
            return lang or default
    except Exception:
        pass
    return default


def _support_admin_email() -> str:
    return getattr(settings, "SUPPORT_INBOX_EMAIL", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")


ADMIN_LANG = "en"


class SupportContactView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info("SupportContactView hit user=%s email=%s", request.user.id, request.user.email)

        ser = SupportContactSerializer(data=request.data)
        if not ser.is_valid():
            return err("Validation failed.", ser.errors, code=status.HTTP_400_BAD_REQUEST)

        subject = ser.validated_data["subject"]
        body = ser.validated_data["message"]
        copy_to_user = ser.validated_data.get("copy_to_user", True)

        SupportMessage.objects.create(
            user=request.user,
            kind=SupportMessage.KIND_CONTACT,
            subject=subject,
            body=body,
            copy_to_user=copy_to_user,
            user_email=request.user.email or "",
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
        )

        admin_email = _support_admin_email()
        if not admin_email:
            return err("Support inbox is not configured.", code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        user_lang = _get_user_lang(request.user)

        try:
            # 1) Email to admin (always English)
            send_templated_email(
                to_email=admin_email,
                template_name="profiles/support_contact_admin",
                subject_key="profiles.support_contact_admin.subject",
                lang=ADMIN_LANG,
                reply_to=[request.user.email] if request.user.email else None,
                context={
                    "user": request.user,
                    "subject": subject,
                    "body": body,
                },
            )

            # 2) Optional copy to user (localized)
            if copy_to_user and request.user.email:
                send_templated_email(
                    to_email=request.user.email,
                    template_name="profiles/support_copy",
                    subject_key="profiles.support_copy.subject",
                    lang=user_lang,
                    context={
                        "user": request.user,
                        "subject": subject,
                        "body": body,
                        "kind": "contact",
                    },
                )
        except Exception:
            logger.exception("SupportContactView email send failed user=%s", request.user.id)
            return err("Failed to send support email.", code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return ok("Message sent.", data={}, code=status.HTTP_200_OK)


class SupportBugView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info("SupportBugView hit user=%s email=%s", request.user.id, request.user.email)

        ser = SupportBugSerializer(data=request.data)
        if not ser.is_valid():
            return err("Validation failed.", ser.errors, code=status.HTTP_400_BAD_REQUEST)

        subject = ser.validated_data["subject"]
        description = ser.validated_data["description"]
        copy_to_user = ser.validated_data.get("copy_to_user", True)

        SupportMessage.objects.create(
            user=request.user,
            kind=SupportMessage.KIND_BUG,
            subject=subject,
            body=description,
            copy_to_user=copy_to_user,
            user_email=request.user.email or "",
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:255],
        )

        admin_email = _support_admin_email()
        if not admin_email:
            return err("Support inbox is not configured.", code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        user_lang = _get_user_lang(request.user)

        meta = {
            "user_id": request.user.id,
            "email": request.user.email,
            "user_agent": request.META.get("HTTP_USER_AGENT"),
            "ip": request.META.get("REMOTE_ADDR"),
        }

        try:
            # 1) Email to admin (always English)
            send_templated_email(
                to_email=admin_email,
                template_name="profiles/support_bug_admin",
                subject_key="profiles.support_bug_admin.subject",
                lang=ADMIN_LANG,
                reply_to=[request.user.email] if request.user.email else None,
                context={
                    "user": request.user,
                    "subject": subject,
                    "body": description,
                    "meta": meta,
                },
            )

            # 2) Optional copy to user (localized)
            if copy_to_user and request.user.email:
                send_templated_email(
                    to_email=request.user.email,
                    template_name="profiles/support_copy",
                    subject_key="profiles.support_copy.subject",
                    lang=user_lang,
                    context={
                        "user": request.user,
                        "subject": subject,
                        "body": description,
                        "kind": "bug",
                    },
                )
        except Exception:
            logger.exception("SupportBugView email send failed user=%s", request.user.id)
            return err("Failed to send bug report email.", code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return ok("Bug report sent.", data={}, code=status.HTTP_200_OK)
