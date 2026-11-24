# Readings module boundaries

- `views.py` owns HTTP authentication, permission-scoped device lookup, input serializers, and response/status mapping. Routes and response formats are unchanged.
- `pump_service.py` owns scheduling, cancellation, delivery/retry policy, automatic-watering claims, cooldown reservations, completion receipts, and completion notifications.
- `history.py` owns chart buckets, 24-hour aggregates, deletion options, and history deletion with latest-snapshot repair.
- `exports.py` owns owner-scoped export queries, spreadsheet rendering, and attachment metadata. The view coordinates email delivery.
- Existing `device_auth.py`, serializers, code generation, throttles, and notification delivery modules retain their responsibilities.

## Transaction and access requirements

Pump operations lock the device before locking/updating its tasks. Completion notifications are registered with `transaction.on_commit`, and repeated completion receipts do not send another notification. Manual scheduling retains its existing per-device deduplication and firmware-duration checks.

`configure_automatic_watering` receives a device already locked inside the device viewset's atomic transaction. Its caller must retain that contract. Other mutating pump operations establish their own transactions.

History views distinguish shared read access from owner-only deletion. The deletion service re-locks the owner's device and updates its latest reading snapshot within the same transaction. Exports remain owner-only.

Service validation exceptions are mapped to the existing HTTP errors by the views. Service functions do not construct DRF responses or consume request objects.

The readings API tests exercise these modules through their public endpoints, including permission boundaries, firmware compatibility, duplicate completion, cooldowns, exports, and history deletion. Notification mocks target the service where the callback is now used.

## Physical-device backend foundations (IoT Phase 2)

This phase adds backend infrastructure only. It does not enable BLE pairing in the
mobile app, change generated firmware, alter GPIO assignments, or deploy anything.
Firmware and BLE integration are later phases.

### Factory trust and secrets

`PhysicalDevice` is enrolled by a trusted operator using
`manage.py enroll_physical_device public-record.json`. The exact JSON fields are
`hardware_id`, `bootstrap_public_key` (base64 raw 32-byte Ed25519 public key),
`provisioning_pop_digest` (lowercase SHA-256 of a unique high-entropy BLE PoP),
`hardware_profile`, and `hardware_revision`. Hardware ID, public key and PoP digest
must each be unique. The command rejects additional fields, duplicate enrollment,
malformed records and private-key material. It never updates an existing identity.
Do not import untrusted enrollment records or derive credentials from a MAC address.

The factory must generate and protect a different bootstrap private key and random
BLE PoP for every board. Neither is uploaded to Django. The PoP authenticates the
later Espressif BLE provisioning channel; its digest here is inventory evidence,
not a replacement for that protocol. Firmware must verify the TLS server and keep
bootstrap identity, runtime credential and pump safety state in separate NVS areas.
No actual factory identities or hardware have been provisioned in this phase.

### API under `/readings/`

| Method and suffix | Caller and purpose |
| --- | --- |
| POST `pairing/` | Owner JWT: `device_id`, `hardware_id`, optional `replaces_hardware_id`. Starts a 10-minute single-use session. |
| GET/DELETE `pairing/<uuid>/` | Same owner: inspect status or cancel a pending claim. Expired claims cannot complete. |
| POST `pairing/complete/` | Board over HTTPS: `session_id`, short-lived `claim`, base64 Ed25519 `signature`. |
| GET/DELETE `devices/<id>/identity/` | Owner only: inspect physical/sync status, or explicitly revoke/unbind hardware. |
| POST `configuration/` | Board token: fetch desired version, full runtime configuration and its digest. |
| POST `configuration/ack/` | Board token: acknowledge exact `version` and `config_digest`, `applied`, optional `firmware_version` and rejection `error_code`. |

The existing logical-device CRUD remains the single settings writer. Both canonical
and legacy aliases still work. Runtime changes increment `desired_config_version`;
renaming or editing notes does not. The auto-pump endpoint increments the same version.

Start returns `proof_payload`: base64 of canonical UTF-8 JSON, sorted keys and compact
separators. It contains `protocol=flovers-pair-v1`, `session_id`, `hardware_id`,
`device_id`, `generation`, `challenge`, and SHA-256 `claim_digest`. The board signs
the decoded bytes with its factory private key. Firmware must validate the protocol
and its own hardware identity before signing. There is no custom signature algorithm;
verification uses the existing `cryptography` Ed25519 implementation.

The completion endpoint alone returns a new random 384-bit `device_token`, once,
with `Cache-Control: no-store`. Only its SHA-256 digest is stored. Send it in
`X-Flovers-Device-Token`, never a query string or form field. Do not log pairing
claims, signatures, tokens or Wi-Fi credentials. If the issuance response is lost,
the owner must revoke/unbind and start again; no plaintext token recovery exists.
Ordinary owner/shared API responses never contain the token or factory keys.

### Binding, cancellation and replacement

Pairing proceeds `pending -> bound -> confirmed`. A valid factory signature atomically
binds the board and issues its credential. Only a later authenticated board request
confirms the session. BLE/Wi-Fi success alone cannot confirm it. Pairing starts are
owner-rate-limited; anonymous signature submissions have a separate IP budget.
Creation has a 30/hour owner budget. Status/cancellation polling has a separate
120/minute owner budget so verifying a pending session cannot exhaust creation limits.
The anonymous limit may need tuning for deployments behind shared NATs.

The logical device and physical identity are row-locked; a one-to-one database
constraint prevents multiple boards for one logical record, and a conditional unique
constraint allows only one active credential per board. Replay, expired/cancelled
sessions, inactive accounts, disabled hardware and concurrent claim losers are rejected.
Replacement requires the current hardware ID explicitly. It revokes the old credential,
invalidates old sessions and pending/delivered pump commands, preserves readings and
cooldown reservations, and leaves automatic watering OFF. Ordinary Wi-Fi changes
must not call replacement or revoke APIs. They retain identity, token and safety state.

### Configuration and backward compatibility

Factory boards use the same existing ingest, feed and pump endpoints with scoped tokens.
An explicit invalid token never falls back to a valid legacy account secret. Account-secret
authentication continues unchanged for unclaimed DIY devices; a bound factory device
cannot use the legacy path. Shared viewers cannot claim, revoke or configure hardware.

Saving desired settings is not an application acknowledgement. Status is pending until
the board validates/applies the current configuration and acknowledges its exact version
and digest. Stale acknowledgements return 409. Rejections store only a bounded code
(`invalid_config`, `storage_failed`, `unsupported`), never arbitrary device error text.
Disabled devices may still fetch/acknowledge their disable configuration but cannot
ingest readings or run a pump. Online means authenticated contact within five minutes;
pairing is retained when offline. Missing factory identity is reported as
`legacy-or-not-paired`, not incorrectly labeled as a broken or unpaired DIY device.

Factory-board pump dispatch/automatic claims additionally require current applied
configuration. They reuse the existing pump policy, cooldown and task receipt logic.
Configuration explicitly forbids offline automatic watering and always requires backend
authorization. Existing DIY pump behavior and firmware remain unchanged.

Migration `0011_physical_device_foundations` adds metadata and identity tables without
rebinding or deleting existing devices/readings. It has not been run in production.
It is a pending schema migration: the existing LIGHT deployment gate must reject a
deployment until a separately approved migration-capable release is arranged.
Reversing it after real pairing discards new identities/credentials; do not roll it back
as a routine recovery step.

The local mobile implementation and native security details are documented in
[Mobile BLE pairing](../../docs/devices/MOBILE_BLE_PAIRING.md).
