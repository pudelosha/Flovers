"""Readiness polling only; never retry a smoke journey or a state-changing API."""
import time
import urllib.request

deadline = time.monotonic() + 45
while time.monotonic() < deadline:
    try:
        request = urllib.request.Request("http://127.0.0.1:8000/auth/login/", method="OPTIONS")
        with urllib.request.urlopen(request, timeout=3) as response:
            if response.status == 200:
                break
    except OSError:
        time.sleep(1)
else:
    raise RuntimeError("Disposable Django API did not become ready within 45 seconds")
