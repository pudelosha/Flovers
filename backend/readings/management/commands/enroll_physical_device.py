"""Offline factory enrollment of PUBLIC identity data, never private board keys."""
import base64
import json
import re
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError
from readings.models import PhysicalDevice


class Command(BaseCommand):
    help = "Enroll a factory hardware identity from a public JSON record (operator-only)."

    def add_arguments(self, parser):
        parser.add_argument("record")

    def handle(self, *args, **options):
        try:
            record = json.loads(Path(options["record"]).read_text(encoding="utf-8"))
            required = {"hardware_id", "bootstrap_public_key", "provisioning_pop_digest", "hardware_profile", "hardware_revision"}
            if not isinstance(record, dict) or set(record) != required or not all(isinstance(v, str) for v in record.values()):
                raise ValueError()
            if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", record["hardware_id"]):
                raise ValueError()
            if not re.fullmatch(r"[0-9a-f]{64}", record["provisioning_pop_digest"]):
                raise ValueError()
            for key, limit in (("hardware_profile", 64), ("hardware_revision", 32)):
                if not re.fullmatch(r"[A-Za-z0-9._-]{1," + str(limit) + r"}", record[key]):
                    raise ValueError()
            raw = base64.b64decode(record["bootstrap_public_key"], validate=True)
            Ed25519PublicKey.from_public_bytes(raw)
            record["bootstrap_public_key"] = base64.b64encode(raw).decode("ascii")
        except (OSError, ValueError, TypeError):
            raise CommandError("Invalid public enrollment record; no identity was enrolled.")
        try:
            PhysicalDevice.objects.create(**record)
        except IntegrityError:
            raise CommandError("Hardware ID, bootstrap key or PoP identity already enrolled.")
        self.stdout.write("Public hardware identity enrolled. No private keys were imported.")
