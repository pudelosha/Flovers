"""Offline factory CLI. Never imports Django or connects to an application backend."""
import argparse
import getpass
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from firmware.factory.materials import generate_batch, create_vault, open_vault
from firmware.factory.labels import export_labels
from firmware.factory.program import program_device


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    generate = commands.add_parser("generate")
    generate.add_argument("--manifest", type=Path, required=True)
    generate.add_argument("--output", type=Path, required=True)
    generate.add_argument("--resume", action="store_true")
    archive = commands.add_parser("archive")
    archive.add_argument("--directory", type=Path, required=True)
    archive.add_argument("--output", type=Path, required=True)
    for name in ("labels", "program", "verify-vault"):
        command = commands.add_parser(name)
        command.add_argument("--vault", type=Path, required=True)
        if name != "verify-vault":
            command.add_argument("--output", type=Path, required=True)
            command.add_argument("--hardware-id", required=name == "program")
        if name == "labels":
            command.add_argument("--format", choices=["png", "svg", "pdf"], default="pdf")
            command.add_argument("--width-mm", type=float, default=45)
            command.add_argument("--height-mm", type=float, default=45)
        if name == "program":
            command.add_argument("--confirm-hardware-id", required=True)
            command.add_argument("--new-board", action="store_true")
            command.add_argument("--port", required=True)
            command.add_argument("--firmware", type=Path, required=True)
            command.add_argument("--firmware-variant", choices=["sensors", "pump"], required=True)
            command.add_argument("--firmware-sha256", required=True)
            command.add_argument("--tool-python", type=Path, required=True)
            for flag in ("esptool", "nvs-generator"):
                command.add_argument("--" + flag, type=Path, required=True)
                command.add_argument("--" + flag + "-sha256", required=True)
    args = parser.parse_args()
    try:
        if args.command == "generate":
            if args.manifest.stat().st_size > 2_000_000:
                raise ValueError()
            generate_batch(json.loads(args.manifest.read_text(encoding="utf-8")), args.output, resume=args.resume)
        elif args.command == "archive":
            phrase = getpass.getpass("New factory-kit passphrase (16+ characters): ")
            if phrase != getpass.getpass("Confirm passphrase: "):
                raise ValueError()
            create_vault(args.directory, args.output, phrase)
            open_vault(args.output, phrase)  # Authenticate and validate before reporting success.
        else:
            manifest, kit = open_vault(args.vault, getpass.getpass("Factory-kit passphrase: "))
            if args.command == "labels":
                export_labels(manifest, kit, args.output, format=args.format, hardware_id=args.hardware_id,
                    width_mm=args.width_mm, height_mm=args.height_mm)
            elif args.command == "program":
                program_device(manifest, kit, **{k: v for k, v in vars(args).items() if k not in {"vault", "command"}})
    except Exception:
        # No secret-bearing exception, parser value or tool output may reach stdout/stderr.
        parser.exit(1, "Factory operation rejected. Check custody, inventory, checksums and output paths. No secrets printed.\n")
    print("Factory operation complete. No private credentials printed; no backend or production service accessed.")


if __name__ == "__main__":
    main()
