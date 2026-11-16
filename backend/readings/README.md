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
