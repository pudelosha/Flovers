from django.conf import settings
from django.http import HttpResponse
from urllib.parse import urlencode

from .utils import build_mobile_deeplink

_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Opening Flovers…</title>
  <style>
    body {{ margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0e1f1a; color:#fff; }}
    .wrap {{ min-height:100vh; display:grid; place-items:center; padding:24px; }}
    .card {{ background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:16px; padding:20px; max-width:520px; }}
    a.btn {{ display:inline-block; margin-top:12px; padding:10px 14px; border-radius:10px; background:#0B7285; color:#fff; text-decoration:none }}
    code {{ background:rgba(0,0,0,.3); padding:2px 6px; border-radius:6px; }}
  </style>
  <script>
    window.addEventListener('DOMContentLoaded', function() {{
      var deeplink = "{deeplink}";
      // Try to open the app immediately
      window.location.replace(deeplink);
      // As a fallback, keep this page visible so the user can tap the button or copy the link.
    }});
  </script>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h2>Opening Flovers…</h2>
      <p>If nothing happens, tap the button below to open the app:</p>
      <p><a class="btn" href="{deeplink}">Open in app</a></p>
      <p>Or copy this link: <code>{deeplink}</code></p>
    </div>
  </div>
</body>
</html>
"""

def _html_response(deeplink: str) -> HttpResponse:
    html = _HTML.format(deeplink=deeplink.replace('"', '&quot;'))
    return HttpResponse(html, content_type="text/html; charset=utf-8")

def open_activate(request):
    uid = request.GET.get("uid") or ""
    token = request.GET.get("token") or ""
    deeplink = build_mobile_deeplink("confirm-email", {"uid": uid, "token": token})
    return _html_response(deeplink)

def open_reset_password(request):
    uid = request.GET.get("uid") or ""
    token = request.GET.get("token") or ""
    deeplink = build_mobile_deeplink("reset-password", {"uid": uid, "token": token})
    return _html_response(deeplink)
