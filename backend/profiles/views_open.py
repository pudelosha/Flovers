from django.conf import settings
from django.http import HttpResponse


def _deeplink_base() -> str:
    scheme = getattr(settings, "DEEP_LINK_SCHEME", "flovers").strip()
    host = (getattr(settings, "DEEP_LINK_HOST", "") or "").strip().strip("/")
    return f"{scheme}://{host}" if host else f"{scheme}://"


def _mobile_home_link() -> str:
    base = _deeplink_base()
    if base.endswith("://"):
        return f"{base}home"
    return f"{base}/home"


def open_home(request, destination="home"):
    deep_link = _mobile_home_link()
    if destination == "task-history":
        from .utils import build_mobile_deeplink
        plant_id = request.GET.get("plantId", "")
        params = {"plantId": plant_id} if plant_id.isascii() and plant_id.isdecimal() else {}
        deep_link = build_mobile_deeplink("task-history", params)
    web_fallback = getattr(settings, "PUBLIC_WEB_BASE", settings.SITE_URL).rstrip("/") or "https://flovers.app"

    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Open Flovers</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url={deep_link}">
  <script>
    window.location.replace("{deep_link}");
    setTimeout(function() {{
      window.location.replace("{web_fallback}");
    }}, 1200);
  </script>
  <style>
    body {{
      font-family: Arial, sans-serif;
      background: #0f1a17;
      color: #e9f3ef;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }}
    .card {{
      max-width: 520px;
      width: 100%;
      padding: 24px;
      border-radius: 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
    }}
    a {{
      color: #9ad7df;
    }}
  </style>
</head>
<body>
  <div class="card">
    <h1>Opening Flovers…</h1>
    <p>If nothing happens, <a href="{deep_link}">open the app</a>.</p>
  </div>
</body>
</html>"""
    return HttpResponse(html)
