"""Build source bundles only. Never connects to or flashes a physical board."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from readings.universal_codegen import generate_universal_firmware


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend", required=True, help="Fixed HTTPS backend origin")
    parser.add_argument("--output", type=Path, required=True, help="New flovers_universal sketch directory")
    parser.add_argument("--pump", action="store_true")
    args = parser.parse_args()
    files = generate_universal_firmware(base_url=args.backend, pump_included=args.pump)
    if args.output.name != "flovers_universal":
        parser.error("Output directory must be named flovers_universal")
    args.output.mkdir(parents=True, exist_ok=False)
    for name, contents in files.items():
        (args.output / name).write_text(contents, encoding="utf-8")
    print("Universal firmware source generated; no customer credentials and no device access.")


if __name__ == "__main__":
    main()
