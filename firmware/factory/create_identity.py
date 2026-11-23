"""Offline factory record generation. Private output must never enter a repository."""
import argparse
import base64
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import secrets

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def write_private(path, data):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
        handle.write(data)


def create_identity(output, hardware_id):
    output = Path(output).resolve()
    if any((parent / ".git").exists() for parent in (output, *output.parents)):
        raise ValueError("Factory output must be outside every Git working tree.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", hardware_id):
        raise ValueError("Invalid hardware ID.")
    private = Ed25519PrivateKey.generate()
    pop = secrets.token_urlsafe(32)
    record = {"hardware_id": hardware_id, "seed": private.private_bytes_raw().hex(), "pop": pop,
              "hardware_profile": "esp32-c3-flovers-v1", "hardware_revision": "1"}
    public = {key: record[key] for key in ("hardware_id", "hardware_profile", "hardware_revision")}
    public.update(bootstrap_public_key=base64.b64encode(private.public_key().public_bytes_raw()).decode(),
                  provisioning_pop_digest=hashlib.sha256(pop.encode()).hexdigest())
    qr = {"version": 1, "type": "flovers-device", "hardware_id": hardware_id,
          "name": "FLOVERS_" + hardware_id[-8:], "transport": "ble", "pop": pop}
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    write_private(output / "factory-private.json", json.dumps(record, separators=(",", ":")))
    write_private(output / "public-enrollment.json", json.dumps(public, indent=2) + "\n")
    write_private(output / "device-qr.json", json.dumps(qr, separators=(",", ":")))
    import io
    csv_text = io.StringIO(newline="")
    writer = csv.writer(csv_text)
    writer.writerow(["key", "type", "encoding", "value"])
    writer.writerow(["flovers-factory", "namespace", "", ""])
    writer.writerow(["identity", "data", "string", json.dumps(record, separators=(",", ":"))])
    write_private(output / "factory-nvs.csv", csv_text.getvalue())
    return public


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--hardware-id", default=None)
    args = parser.parse_args()
    try:
        create_identity(args.output, args.hardware_id or "FL-" + secrets.token_hex(16).upper())
    except (ValueError, FileExistsError) as error:
        parser.error(str(error))
    print("Factory records generated offline. Private seed and PoP were not printed. No hardware was accessed.")


if __name__ == "__main__":
    main()
