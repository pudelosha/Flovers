# Mandatory generated ESP32-C3 compilation (P0-C3)

`test-firmware.yml` compiles both **real generated** `.ino` variants with Arduino's
preprocessing and RISC-V toolchain. It never uploads, opens a serial port, connects
to a board, starts firmware, actuates a relay or calls a Flovers service. Generated
sketches contain only synthetic test identifiers and placeholder Wi-Fi credentials.

## Exact supported build

| Dependency | Version |
| --- | --- |
| Arduino CLI | **1.6.0** |
| Espressif Arduino ESP32 core | **3.3.12** |
| BH1750 | **1.3.0** |
| Adafruit BME280 Library | **2.3.0** |
| Adafruit BusIO (transitive) | **1.17.4** |
| Adafruit Unified Sensor (transitive) | **1.1.15** |

Target: the **ESP32C3 Dev Module** configuration used with Flovers'
**Olimex ESP32-C3-DevKit-Lipo**. The board has an ESP32-C3-MINI-1-N4, 160 MHz CPU
and 4 MB flash ([manufacturer specifications](https://www.olimex.com/Products/IoT/ESP32-C3/ESP32-C3-DevKit-Lipo/open-source-hardware)).
The pre-existing compile test already selected this C3 module with USB CDC enabled.
The pinned FQBN makes the existing CPU/flash/partition defaults explicit:

```text
esp32:esp32:esp32c3:CDCOnBoot=cdc,CPUFreq=160,FlashSize=4M,PartitionScheme=default
```

The generator, pins, TLS trust anchors, protocol, pump timing, cooldown, persistence,
claims/retries and safety logic are unchanged. This lane covers compilation for
this exact board/core configuration, not every ESP32 or Arduino model.

## Reproducibility and isolation

`toolchain.lock.json` records exact CLI release archive hashes for Linux x86-64 and
Windows x64, the selected core's archive metadata, all 18 vendor-pinned tool/SDK
dependencies and all four direct/transitive libraries. The CLI archive is checked
before extraction. The official indexes' selected archive URLs/checksums/versions
are checked against the lock before installing. Arduino CLI performs its normal
archive checksum validation; signature/checksum safeguards are not disabled.
Libraries install with `--no-deps` so the resolver cannot silently select newer
transitive dependencies. Installed core/library versions are then verified.

Sources: [Arduino CLI release](https://github.com/arduino/arduino-cli/releases/tag/v1.6.0),
[Espressif package index](https://espressif.github.io/arduino-esp32/package_esp32_index.json),
[Arduino library index](https://downloads.arduino.cc/libraries/library_index.json.gz).

Each run provisions into a dedicated temporary directory. Personal Arduino IDE
settings and existing `ARDUINO_*` environment overrides are not used. No production
configuration, database, SMTP, Firebase or device credentials are inputs. Platform
archives are large; this deliberately exercises a clean installation rather than
accepting an unverified globally installed compiler.

## Execution and evidence

The existing two parametrized cases in `backend/readings/tests/test_codegen.py`
carry the `firmware_compile` marker. Their names and compilation assertions remain.
The dedicated job requires these exact two identities in JUnit and permits **zero
skips**. A missing CLI/core/library, failed provision, wrong target, compile timeout,
compiler error, missing `.bin`/`.elf`, missing JUnit or deselected case fails the lane.
Both variants run even when the first test fails (no `-x` or matrix fail-fast).

Artifacts retained seven days include installation stdout/stderr, version reports,
board configuration, verified lock, generated sketches, full compiler stdout/stderr,
commands, per-variant results, firmware binaries and JUnit/Markdown summaries.
All artifact inputs are synthetic; compiled binaries are never published as a
release or installed on hardware.

The existing **21 host C++ checks** remain in the normal backend suite and are
unchanged. They test payload and pump retry/execution semantics; target compilation
adds preprocessing/linking evidence and does not replace those behavioral checks.

Both historical Arduino skip exceptions were removed **after two independent clean
hosted firmware runs passed both variants**. The backend lane selects
`-m "not firmware_compile"`; the dedicated lane requires the two target builds.
No tests are deleted. Both lanes allow zero skips; the backend additionally requires
all 21 existing host C++ cases by their exact JUnit identities, alongside the 13
PostgreSQL concurrency cases. No production deployment workflow or host compiler
setting is changed.

The Celery workflow now explicitly selects its existing `test_delivery.py` file.
Its old repository-wide collection visited the contract suite's unrelated session
hook: all 11 real-service tests passed but the process then failed at session end.
Explicit selection preserves all required cases while isolating suite lifecycle hooks.
The broker-restart test also polls the durable gate result before its existing
`get`: a pre-restart Pub/Sub subscription could miss the completion event even
though the worker and invitation had completed. The original 40-second bound and
all queue, process, delivery and idempotency assertions are preserved.

## Local commands

From repository root, use the locked backend Python environment:

```sh
python -m unittest discover -s firmware/ci/tests -p 'test_*.py'
python firmware/ci/provision.py --root /tmp/flovers-esp32 --results /tmp/flovers-firmware-results
```

Set the four `FLOVERS_TEST_ARDUINO_*` values from the generated
`environment.json` and set `DJANGO_SETTINGS_MODULE=app.ci_settings`, then from `backend` run:

```sh
python -m pytest readings/tests/test_codegen.py -m firmware_compile -ra --junitxml=/tmp/flovers-firmware-results/firmware.xml
```

Use a fresh dedicated directory and sufficient free space. Do not point this
provisioner at your Arduino IDE profile. The CI workflow exports the environment
automatically through `GITHUB_ENV`.

Run the normal local backend suite with `python -m pytest -m "not firmware_compile"`
when the target compiler is not provisioned. Selecting a firmware case without its
compiler now fails rather than skipping.

## Limits

Compilation cannot prove electrical wiring, sensor accuracy, relay polarity,
physical pump behavior, USB drivers, Wi-Fi association, on-device NVS persistence,
power-loss recovery or TLS/server interoperability. Hardware tests remain a
separately approved activity. The standalone workflow fails on compilation errors;
making its check mandatory for merging requires repository branch protection,
which this change does not alter.

The existing generated code redefines the sensor library's `BME280_ADDRESS` macro
to select address `0x76`; `--warnings all` makes that pre-existing warning visible.
Both variants compile successfully with it. The address and generated device logic
are deliberately unchanged; physical sensor addressing still depends on wiring.
