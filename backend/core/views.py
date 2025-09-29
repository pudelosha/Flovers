from django.core.mail import send_mail
from django.http import JsonResponse

def test_email(request):
    send_mail(
        subject="Hello from Django",
        message="It works!",
        from_email=None,
        recipient_list=["test@local.test"],
        fail_silently=False,
    )
    return JsonResponse({"ok": True})
