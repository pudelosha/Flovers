"""Trusted SSH/operator entry point. Accepts and exports public material only."""
import json
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from readings import manufacturing as service
from readings.models import ManufacturingBatch, PhysicalDevice


def read_public(path):
    source = Path(path)
    if source.stat().st_size > 2_000_000:
        raise ValueError("Input too large.")
    return json.loads(source.read_text(encoding="utf-8"))


def write_export(path, content):
    target = Path(path).expanduser()
    if target.is_symlink() or not target.parent.is_dir():
        raise ValueError("Output requires an existing directory and must not be a symlink.")
    resolved = target.resolve()
    for key in ("MEDIA_ROOT", "PRIVATE_MEDIA_ROOT", "STATIC_ROOT"):
        configured = getattr(settings, key, None)
        if configured and resolved.is_relative_to(Path(configured).resolve()):
            raise ValueError("Manufacturing exports must be outside application media/static storage.")
    import os
    fd = os.open(resolved, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="") as stream:
        stream.write(content)


class Command(BaseCommand):
    help = "Manufacturing inventory: no private keys or printable PoPs are accepted or exported."

    def add_arguments(self, parser):
        commands = parser.add_subparsers(dest="operation", required=True)
        batch = commands.add_parser("batch")
        batch.add_argument("--batch", required=True)
        batch.add_argument("--operation-id", required=True)
        batch.add_argument("--count", required=True, type=int)
        batch.add_argument("--profile", default=service.PROFILE)
        batch.add_argument("--revision", default="1")
        batch.add_argument("--variant", choices=["sensors", "pump"], default="sensors")
        batch.add_argument("--notes", default="")
        batch.add_argument("--output", required=True, help="Public station manifest; exclusive new file")
        for name in ("list", "export"):
            command = commands.add_parser(name)
            command.add_argument("--batch")
            command.add_argument("--profile")
            command.add_argument("--status", choices=["registered", "programmed", "verified", "ready", "retired"])
            command.add_argument("--hardware-id")
            command.add_argument("--serial")
            if name == "export":
                command.add_argument("--output", required=True)
        inspect = commands.add_parser("inspect")
        inspect.add_argument("--hardware-id", required=True)
        for name in ("enroll", "verify"):
            command = commands.add_parser(name)
            command.add_argument("--input", required=True, help="Public enrollment manifest or signed public receipt")
        status = commands.add_parser("status")
        status.add_argument("--hardware-id", required=True)
        status.add_argument("--status", required=True, choices=["ready", "retired"])

    def handle(self, *args, **options):
        try:
            op = options["operation"]
            if op == "batch":
                batch = service.allocate_batch(code=options["batch"], operation_id=options["operation_id"],
                    count=options["count"], hardware_profile=options["profile"], hardware_revision=options["revision"],
                    firmware_variant=options["variant"], notes=options["notes"])
                write_export(options["output"], json.dumps(service.batch_manifest(batch), indent=2) + "\n")
                self.stdout.write(f"Batch {batch.code}: {batch.devices.count()} public inventory records. No private identities generated.")
            elif op in {"enroll", "verify"}:
                data = read_public(options["input"])
                if op == "enroll":
                    service.enroll_batch(data)
                else:
                    service.record_verification(data)
                self.stdout.write("Public manufacturing record accepted.")
            elif op == "status":
                service.set_status(options["hardware_id"], options["status"])
                self.stdout.write("Manufacturing status updated.")
            else:
                devices = PhysicalDevice.objects.all()
                for option, field in (("batch", "manufacturing_batch__code"), ("profile", "hardware_profile"),
                        ("status", "manufacturing_status"), ("hardware_id", "hardware_id"), ("serial", "serial_number")):
                    if options.get(option):
                        devices = devices.filter(**{field: options[option]})
                if op == "export":
                    write_export(options["output"], service.inventory_csv(devices))
                    self.stdout.write("Non-sensitive inventory exported.")
                else:
                    self.stdout.write(json.dumps(list(service.inventory_rows(devices)), indent=2))
        except (OSError, ValueError, TypeError, ValidationError, ManufacturingBatch.DoesNotExist, PhysicalDevice.DoesNotExist):
            # Never echo malicious/sensitive input values or raw exceptions.
            raise CommandError("Manufacturing operation rejected. Check input, state, uniqueness and output permissions; no secrets were logged.") from None
