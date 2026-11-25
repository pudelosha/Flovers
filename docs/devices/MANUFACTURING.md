# Manufacturing and physical-device inventory

This extends the existing PhysicalDevice/BLE architecture. It does not create customer
accounts, change GPIOs, enable OTA, contact production, flash a board automatically,
or enable watering. A real factory run is an explicit local operator operation.

## Boundaries and identity custody

The backend allocates inventory and stores public enrollment keys, PoP SHA-256 digests,
serial numbers, batch information and public verification receipts. It never accepts
bootstrap private keys, raw PoPs, QR payloads or NVS images. Existing legacy enrollment
and DIY firmware remain supported. Newly manufactured inventory has a null public key
until enrollment and is not pairable until marked ready.

The local station generates an Ed25519 identity and independent 256-bit BLE PoP for
each allocated board using the existing factory generator. The universal firmware
binary is identical within a hardware profile AND variant (sensors / sensors+pump).
It contains no customer credentials. Keep the existing JSON QR protocol unchanged:

```json
{"version":1,"type":"flovers-device","hardware_id":"SYNTHETIC_0001","name":"FLOVERS_TIC_0001","transport":"ble","pop":"synthetic-placeholder-not-a-real-label-secret"}
```

The BLE name must be `FLOVERS_` plus the hardware ID's final eight characters. The
parser rejects added fields. Serial numbers are printed beside the QR, not added to
its payload. Plant QR scanning remains unchanged. A copied QR does not release an
existing binding; backend ownership checks and physical bootstrap proof still apply.

Encrypted factory kits use scrypt (N=32768,r=8,p=1) and AES-256-GCM. A passphrase is
entered through a hidden prompt, never a command argument or environment variable.
There is no server-side label reprint: Django cannot reconstruct a PoP from its digest.
Reprinting decrypts the existing local kit in memory and never regenerates identities.
Retain the encrypted kit and its independently stored passphrase if reprinting is needed.

## Backend commands: public material only

Run these inside the backend environment after the reviewed migration has been
deployed separately. In the existing Compose layout the Django service is `web`,
working directory `/app`; the VPS deployment directory has been `/opt/app`.
Confirm the actual Compose project before a real run. No production commands were
executed while implementing this feature.

```sh
python manage.py manufacturing batch --batch FLV-2026-001 \
  --operation-id 96dc1ada-18ac-436b-aea3-9dc725305320 \
  --count 50 --variant sensors --output /protected/public/station-manifest.json

python manage.py manufacturing enroll --input /protected/public/public-batch-enrollment.json
python manage.py manufacturing verify --input /protected/public/public-verification.json
python manage.py manufacturing status --hardware-id HARDWARE_ID --status ready

python manage.py manufacturing list --batch FLV-2026-001
python manage.py manufacturing list --status ready --profile esp32-c3-flovers-v1
python manage.py manufacturing inspect --hardware-id HARDWARE_ID
python manage.py manufacturing export --batch FLV-2026-001 --output /protected/public/inventory.csv
python manage.py manufacturing status --hardware-id HARDWARE_ID --status retired
```

Use a NEW UUID operation ID for a NEW allocation request. Repeating the same UUID
and identical parameters returns the existing batch; changing parameters or reusing
the batch code for a different operation fails. Files are exclusive: an existing
export is never overwritten. If export fails after DB allocation, repeat the same
request/operation ID with a new output path. Database transactions do not roll back
filesystem writes. Only complete, validated enrollment manifests are accepted, and
repeat enrollment cannot rotate keys. Count is limited to 1–1000 per batch.

Hardware profile `esp32-c3-flovers-v1`, revision `1`, and the sensors/pump variants
are the supported factory combinations. Unrelated hardware must get a reviewed
profile rather than a renamed inventory entry.

## Local station: generate, encrypt and print

Use a trusted station with encrypted storage, no cloud-synced output folder, and the
locked Python dependencies from the repository. Outputs must be outside all Git
working trees. The tools create POSIX 0700 directories/0600 secret files; on Windows
they remove inherited permissions and grant access to the current user's SID before
writing secrets. Windows administrators still have elevated access.

```sh
python firmware/factory/manage.py generate --manifest /protected/station-manifest.json --output /protected/batch
python firmware/factory/manage.py archive --directory /protected/batch --output /protected/batch.flv
python firmware/factory/manage.py verify-vault --vault /protected/batch.flv

python firmware/factory/manage.py labels --vault /protected/batch.flv --format pdf \
  --output /protected/new-print-job --width-mm 45 --height-mm 45
python firmware/factory/manage.py labels --vault /protected/batch.flv --format png \
  --hardware-id HARDWARE_ID --output /protected/new-single-label
python firmware/factory/manage.py labels --vault /protected/batch.flv --format svg \
  --hardware-id HARDWARE_ID --output /protected/new-vector-label
```

Copy ONLY `public-batch-enrollment.json` back to Django. Never transfer
`factory-private.json`, `factory-nvs.csv`, the private working directory, the vault,
passphrase or printed QR payloads to the VPS. The archive command retains its source
directory; verify encrypted kit recovery before explicitly removing private staging
files under the station's encrypted-storage policy. Python cannot reliably wipe
immutable secrets from memory; SSD/COW deletion or overwriting is not a guarantee.

An interrupted generation leaves an incomplete directory, not a new valid batch.
`generate --resume` requires the same manifest and validates existing private/public,
QR and NVS identities before creating missing devices. A partially written identity
is rejected for explicit recovery; it is never silently replaced. Consumers validate
the encrypted kit, completion marker and every identity. There is no automatic
cleanup of previously generated factory material or print jobs.

Labels contain Flovers branding, serial number and “Scan to pair”. PNG uses 300 DPI;
SVG and PDF contain vector QR modules. QR generation uses error correction M and
four-module quiet zones. Label dimensions are validated; modules smaller than
0.35 mm are rejected. Default sheets are A4, 45×45 mm labels, 10 mm page margins and
3 mm gaps. Use 100% / actual-size printing. The final `print-job.json` identifies the
complete selection. Do not use partial output without that final marker. Check a
physical print with the Flovers scanner before distributing a batch. Printer scaling,
enclosure curvature and adhesive quality are not proven by software tests. Print
spools and PDF/PNG/SVG files contain possession material; handle and delete them
under the same restricted factory policy.

## Explicit programming and byte verification

The new local programmer is deliberately restricted to a NEW board with blank NVS.
It is not a field-upgrade, reset, replacement or customer recovery tool. It refuses
non-blank NVS to preserve existing bindings and persistent pump safety records.

Supply a reviewed, merged factory binary for ESP32-C3 at offset zero. The programmer
requires the huge_app layout: NVS offset 0x9000/size 0x5000, factory app offset
0x10000/size 0x300000. Existing DIY partitions are incompatible. Prepare the firmware
through the locked compiler process; record its variant and SHA-256 independently.
Use the ESP32 3.3.12 toolchain's esptool 5.3.1 and matching NVS generator, and verify
the toolchain download against `firmware/ci/toolchain.lock.json`. The script checksums
supplied below must come from that trusted installation, not an unknown download.
Tool executable/import dependencies also belong to the trusted station environment.

```sh
python firmware/factory/manage.py program --vault /protected/batch.flv \
  --hardware-id HARDWARE_ID --confirm-hardware-id HARDWARE_ID --new-board --port COM7 \
  --firmware /protected/reviewed-sensors-merged.bin --firmware-variant sensors --firmware-sha256 APPROVED_SHA256 \
  --tool-python /trusted/python --esptool /trusted/esptool.py --esptool-sha256 APPROVED_TOOL_SHA256 \
  --nvs-generator /trusted/nvs_partition_gen.py --nvs-generator-sha256 APPROVED_GENERATOR_SHA256 \
  --output /protected/new-programming-result
```

The tool creates NVS locally, verifies blank target NVS, writes the merged image and
individual NVS, and reads back the full programmed range. Only an exact byte match
produces `public-verification.json`, signed by the enrolled bootstrap key. All serial
operations explicitly use ESP32-C3 and suppress tool logs; each tool invocation has
a 180-second deadline. The board is left in no-reset mode, not automatically booted.
Disconnect pump power for bench programming and conduct physical safety testing
separately. No GPIO or pump logic is changed by this phase.

Import the public receipt using `manufacturing verify`, then explicitly mark the
device ready. A successful receipt records programmed+verified events atomically.
On failure, no receipt is emitted and no readiness is granted; diagnose the physical
board separately. A board that is now partially programmed/non-blank is intentionally
refused on retry. Recovery/erase of that board requires a separate reviewed factory
procedure. Temporary plaintext readback/NVS files are removed on ordinary success
or failure; hard process/power loss can leave them on the encrypted station disk.

The receipt proves possession of the enrolled signing key and an authorized
station's readback report. It is NOT remote hardware attestation and does not prove
that a dishonest operator performed the test. It does not certify actual BLE, sensor
or pump performance. Those require physical acceptance testing before distribution.

## Django Admin and permissions

Superusers and active staff explicitly granted
`readings.operate_manufacturing` can access the manufacturing views. Ordinary staff
and customers cannot. Admin provides batch allocation, read-only physical inventory,
search/filter, public manifest and CSV downloads, and public enrollment/receipt
uploads at `/admin/readings/manufacturingbatch/import-public/`. An import link is
available on the batch list. It has normal Admin login, authorization and CSRF
protection. No public administrative API is added.

Hardware IDs, key material, serials, batch metadata and receipts are not editable
through device forms. Admin offers explicit ready/retire actions; invalid multi-device
actions are rolled back together. Bound devices cannot be retired through manufacturing.
Audit events record allocations, enrollment, verified programming, readiness,
retirement and Admin exports. Trusted SSH commands use a null actor (OS operator);
Admin operations record the authenticated user. CLI listing/public exports are
read-only. Manufacturing records/events cannot be deleted through Admin.

Manufacturing state is separate from derived pairing state. QR printing and flashing
do not establish customer ownership. Successful authenticated board contact records
activation; the customer relationship remains PhysicalDevice → ReadingDevice → plant.
Online status remains runtime evidence, not an operator-maintained manufacturing flag.

## Docker public-export handling

No production Compose changes or permanent factory-data mount are required. For
public exports only, an operator can create a restrictive temporary directory inside
`web`, execute the commands with `docker compose exec -T web python manage.py ...`,
then use `docker compose cp web:/tmp/flovers-public/inventory.csv ./restricted-export/`
and transfer that public file using SCP/SFTP over the already pinned SSH identity.
Create both directories with restrictive permissions first. Manufacturing export
commands reject application media/static roots, symlinks and existing output files.
Uploads can be copied into the same temporary directory. Delete only those named
public temporary files after verifying transfer; there is no automatic volume prune.
The local factory station does not need a production database or backend credentials.

## Migration and verification

`readings.0012_manufacturing_inventory` adds inventory/audit fields and nullable public
keys for not-yet-enrolled reservations. Existing physical devices keep their IDs,
keys, associations and credentials; null batch membership preserves legacy enrollment.
Do not roll the schema back after new reservations/records exist: removing inventory
loses audit data and restoring non-null public keys fails for un-enrolled reservations.
No migration has been executed against production by this work.

Tests use synthetic keys/data, isolated Django settings and simulated serial tools.
They cover uniqueness/idempotency, atomic enrollment, permission boundaries, public
exports, lifecycle enforcement, pairing readiness, label matrices and formats,
stable re-export, authenticated kit encryption, mismatched identities and programming
failure/readback handling. Existing BLE, plant QR, DIY and pump tests remain intact.
Run backend tests with PostgreSQL in CI for existing concurrent pairing coverage.
No real flashing or BLE verification is claimed until explicitly tested on hardware.
