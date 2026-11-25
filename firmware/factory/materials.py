"""Offline factory custody. No network or Django imports; no secrets in command output."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import zipfile

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from .create_identity import create_identity, write_private

MAX_KIT = 32 * 1024 * 1024
PROFILE = "esp32-c3-flovers-v1"


def protected_directory(path):
    path = Path(path).resolve()
    if any((parent / ".git").exists() for parent in (path, *path.parents)):
        raise ValueError("Factory material must be outside Git working trees.")
    path.mkdir(mode=0o700, parents=True, exist_ok=False)
    if os.name == "nt":
        # chmod(0600) is insufficient on Windows. Set ACL before creating any secrets.
        info = subprocess.run(["whoami", "/user", "/fo", "csv", "/nh"], capture_output=True, text=True, check=True)
        import csv
        sid = next(csv.reader([info.stdout.strip()]))[-1]
        if not re.fullmatch(r"S-1-[0-9-]+", sid):
            raise ValueError("Cannot establish factory-directory owner.")
        subprocess.run(["icacls", str(path), "/inheritance:r", "/grant:r", f"*{sid}:(OI)(CI)F"],
            capture_output=True, check=True)
    else:
        path.chmod(0o700)
    return path


def validate_station_manifest(manifest):
    if not isinstance(manifest, dict) or set(manifest) != {"version", "batch", "hardware_profile", "hardware_revision", "firmware_variant", "devices"}:
        raise ValueError("Invalid public station manifest.")
    if (manifest["version"] != 1 or manifest["hardware_profile"] != PROFILE or manifest["hardware_revision"] != "1" or
            manifest["firmware_variant"] not in {"sensors", "pump"} or
            not isinstance(manifest["batch"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", manifest["batch"])):
        raise ValueError("Unsupported factory configuration.")
    devices = manifest["devices"]
    if not isinstance(devices, list) or not 1 <= len(devices) <= 1000:
        raise ValueError("Invalid batch quantity.")
    ids, serials, names = set(), set(), set()
    for d in devices:
        if (not isinstance(d, dict) or set(d) != {"hardware_id", "serial_number"} or
                not isinstance(d["hardware_id"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", d["hardware_id"]) or
                not isinstance(d["serial_number"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", d["serial_number"]) or
                d["hardware_id"] in ids or d["serial_number"] in serials or d["hardware_id"][-8:] in names):
            raise ValueError("Duplicate or invalid hardware, BLE name or serial number.")
        ids.add(d["hardware_id"]); serials.add(d["serial_number"]); names.add(d["hardware_id"][-8:])
    return manifest


def generate_batch(manifest, output, *, resume=False):
    validate_station_manifest(manifest)
    output = Path(output)
    encoded = json.dumps(manifest, sort_keys=True, separators=(",", ":"))
    if resume:
        if output.is_symlink() or not output.is_dir() or (output / "station-manifest.json").read_text(encoding="utf-8") != encoded:
            raise ValueError("Resume requires the exact original station manifest.")
        if any((parent / ".git").exists() for parent in (output.resolve(), *output.resolve().parents)):
            raise ValueError("Factory material must be outside Git.")
    else:
        output = protected_directory(output)
        write_private(output / "station-manifest.json", encoded)
    public = []
    for slot in manifest["devices"]:
        folder = output / slot["hardware_id"]
        if folder.exists():
            if not resume or folder.is_symlink():
                raise ValueError("Existing factory identity will never be overwritten.")
            record = validate_identity(folder, slot, manifest)
        else:
            record = create_identity(folder, slot["hardware_id"])
        public.append({**record, "serial_number": slot["serial_number"]})
    enrollment = {"version": 1, "batch": manifest["batch"], "devices": public}
    target = output / "public-batch-enrollment.json"
    content = json.dumps(enrollment, indent=2) + "\n"
    if target.exists():
        if target.read_text(encoding="utf-8") != content:
            raise ValueError("Existing enrollment differs; refusing replacement.")
    else:
        write_private(target, content)
    # Created last: its presence alone is not trusted; consumers revalidate every identity.
    complete = output / "complete.json"
    if not complete.exists():
        write_private(complete, json.dumps({"version": 1, "manifest_sha256": hashlib.sha256(encoded.encode()).hexdigest()}))
    return output


def validate_record(private, public, qr, slot, manifest):
    if (set(private) != {"hardware_id", "seed", "pop", "hardware_profile", "hardware_revision"} or
            set(qr) != {"version", "type", "hardware_id", "name", "transport", "pop"}):
        raise ValueError("Invalid factory identity schema.")
    key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private["seed"]))
    expected = {"hardware_id": slot["hardware_id"], "hardware_profile": manifest["hardware_profile"],
        "hardware_revision": manifest["hardware_revision"],
        "bootstrap_public_key": base64.b64encode(key.public_key().public_bytes_raw()).decode(),
        "provisioning_pop_digest": hashlib.sha256(private["pop"].encode()).hexdigest()}
    if public != expected or any(private[k] != expected[k] for k in ("hardware_id", "hardware_profile", "hardware_revision")):
        raise ValueError("Private identity does not match enrolled public identity.")
    if qr != {"version": 1, "type": "flovers-device", "hardware_id": slot["hardware_id"],
            "name": "FLOVERS_" + slot["hardware_id"][-8:], "transport": "ble", "pop": private["pop"]}:
        raise ValueError("Label does not match board identity.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,64}", private["pop"]):
        raise ValueError("Invalid proof of possession.")
    return expected


def validate_identity(folder, slot, manifest):
    if folder.is_symlink():
        raise ValueError("Factory symlinks are forbidden.")
    files = [folder / name for name in ("factory-private.json", "public-enrollment.json", "device-qr.json", "factory-nvs.csv")]
    if any(f.is_symlink() or not f.is_file() for f in files):
        raise ValueError("Incomplete factory identity; recover it explicitly, never regenerate silently.")
    private, public, qr = [json.loads(f.read_text(encoding="utf-8")) for f in files[:3]]
    expected = validate_record(private, public, qr, slot, manifest)
    validate_nvs(files[3].read_bytes(), private)
    return expected


def validate_nvs(raw, private):
    import csv
    rows = list(csv.reader(io.StringIO(raw.decode("utf-8"))))
    if rows[:2] != [["key", "type", "encoding", "value"], ["flovers-factory", "namespace", "", ""]] or len(rows) != 3 or rows[2][:3] != ["identity", "data", "string"] or json.loads(rows[2][3]) != private:
        raise ValueError("NVS material does not match factory identity.")


def create_vault(directory, output, passphrase):
    directory = Path(directory)
    manifest = validate_station_manifest(json.loads((directory / "station-manifest.json").read_text(encoding="utf-8")))
    if not (directory / "complete.json").is_file():
        raise ValueError("Incomplete batch cannot be archived.")
    names = ["station-manifest.json", "complete.json", "public-batch-enrollment.json"]
    for slot in manifest["devices"]:
        validate_identity(directory / slot["hardware_id"], slot, manifest)
        names.extend(slot["hardware_id"] + "/" + name for name in ("factory-private.json", "public-enrollment.json", "device-qr.json", "factory-nvs.csv"))
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in names:
            path = directory / name
            if path.is_symlink():
                raise ValueError("Factory symlinks are forbidden.")
            archive.writestr(name, path.read_bytes())
    plain = stream.getvalue()
    if len(plain) > MAX_KIT or len(passphrase) < 16:
        raise ValueError("Kit too large or passphrase shorter than 16 characters.")
    salt, nonce = secrets.token_bytes(16), secrets.token_bytes(12)
    key = Scrypt(salt=salt, length=32, n=32768, r=8, p=1).derive(passphrase.encode("utf-8"))
    cipher = AESGCM(key).encrypt(nonce, plain, b"FLOVERS-FACTORY-1")
    envelope = {"format": "flovers-factory-v1", "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(), "ciphertext": base64.b64encode(cipher).decode()}
    write_private(Path(output), json.dumps(envelope, separators=(",", ":")))


def open_vault(path, passphrase):
    if Path(path).stat().st_size > MAX_KIT * 2:
        raise ValueError("Encrypted kit is too large.")
    envelope = json.loads(Path(path).read_text(encoding="utf-8"))
    if set(envelope) != {"format", "salt", "nonce", "ciphertext"} or envelope["format"] != "flovers-factory-v1":
        raise ValueError("Unknown encrypted kit format.")
    salt, nonce, cipher = [base64.b64decode(envelope[k], validate=True) for k in ("salt", "nonce", "ciphertext")]
    if len(salt) != 16 or len(nonce) != 12:
        raise ValueError("Invalid encrypted kit.")
    key = Scrypt(salt=salt, length=32, n=32768, r=8, p=1).derive(passphrase.encode("utf-8"))
    plain = AESGCM(key).decrypt(nonce, cipher, b"FLOVERS-FACTORY-1")
    result = {}
    with zipfile.ZipFile(io.BytesIO(plain)) as archive:
        entries = archive.infolist()
        if sum(e.file_size for e in entries) > MAX_KIT or len(entries) > 4003:
            raise ValueError("Uncompressed kit too large.")
        for info in entries:
            if info.filename in result or info.is_dir() or info.filename.startswith(("/", "\\")) or ".." in Path(info.filename).parts or "\\" in info.filename:
                raise ValueError("Invalid kit member.")
            result[info.filename] = archive.read(info)
    manifest = validate_station_manifest(json.loads(result["station-manifest.json"]))
    if "complete.json" not in result:
        raise ValueError("Incomplete manufacturing kit.")
    canonical = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode()
    if json.loads(result["complete.json"]) != {"version": 1, "manifest_sha256": hashlib.sha256(canonical).hexdigest()}:
        raise ValueError("Kit completion marker does not match its manifest.")
    expected_names = {"station-manifest.json", "complete.json", "public-batch-enrollment.json"}
    enrolled = []
    for slot in manifest["devices"]:
        prefix = slot["hardware_id"] + "/"
        private, public, qr = [json.loads(result[prefix + name]) for name in ("factory-private.json", "public-enrollment.json", "device-qr.json")]
        validate_record(private, public, qr, slot, manifest)
        validate_nvs(result[prefix + "factory-nvs.csv"], private)
        enrolled.append({**public, "serial_number": slot["serial_number"]})
        expected_names.update(prefix + name for name in ("factory-private.json", "public-enrollment.json", "device-qr.json", "factory-nvs.csv"))
    if set(result) != expected_names or json.loads(result["public-batch-enrollment.json"]) != {"version": 1, "batch": manifest["batch"], "devices": enrolled}:
        raise ValueError("Kit inventory or enrollment mismatch.")
    return manifest, result
