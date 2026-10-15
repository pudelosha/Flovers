"""Refresh the public documentation example from the backend generator, using placeholders only."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

project = Path(__file__).resolve().parents[2]
spec = spec_from_file_location("flovers_firmware_codegen", project / "backend/readings/codegen.py")
module = module_from_spec(spec)
spec.loader.exec_module(module)
example = module.generate_arduino_code(
    base_url="https://api.flovers.app",
    secret="YOUR_SECRET",
    device_id=123,
    device_key="YOUR_DEVICE_KEY",
    sensors={"temperature": True, "humidity": True, "light": True, "moisture": True},
    pump_included=True,
    interval_hours=1,
)
target = project / "web/src/assets/firmware-example.ino"
if "--check" in sys.argv:
    if not target.exists() or target.read_text(encoding="utf-8") != example:
        raise SystemExit("Public firmware example differs from the backend generator; run this script to refresh it.")
else:
    target.write_text(example, encoding="utf-8", newline="\n")
