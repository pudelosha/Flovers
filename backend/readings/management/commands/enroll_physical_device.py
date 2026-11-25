"""Offline factory enrollment of PUBLIC identity data, never private board keys."""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError
from readings.models import PhysicalDevice
from readings.manufacturing import validate_public_record
from django.core.exceptions import ValidationError


class Command(BaseCommand):
    help = "Enroll a factory hardware identity from a public JSON record (operator-only)."

    def add_arguments(self, parser):
        parser.add_argument("record")

    def handle(self, *args, **options):
        try:
            record = validate_public_record(json.loads(Path(options["record"]).read_text(encoding="utf-8")))

        except (OSError, ValueError, TypeError, ValidationError):
            raise CommandError("Invalid public enrollment record; no identity was enrolled.")
        try:
            PhysicalDevice.objects.create(**record)
        except IntegrityError:
            raise CommandError("Hardware ID, bootstrap key or PoP identity already enrolled.")
        self.stdout.write("Public hardware identity enrolled. No private keys were imported.")
