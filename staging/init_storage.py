"""Initialize only the named disposable volume mountpoints."""
import os
from pathlib import Path

if os.environ.get("FLOVERS_STAGING") != "1":
    raise RuntimeError("Disposable staging flag required")
for name in ("/app/private-media", "/app/media", "/app/staticfiles", "/state"):
    path = Path(name)
    if not path.is_mount():
        raise RuntimeError(f"Missing disposable volume: {name}")
    os.chown(path, 10001, 10001)
    path.chmod(0o700 if name in {"/app/private-media", "/state"} else 0o755)
    print(f"Initialized disposable mount {name}: uid={path.stat().st_uid} mode={path.stat().st_mode & 0o777:o}")
