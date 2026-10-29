# Plant sharing

Sharing is persisted on the backend and requires an accepted contact. Each plant
can have several recipients, with independent view-only or task-completion
permissions and an optional end date. A recipient cannot edit the plant, its
reminders, photos, devices, or pump configuration.

## API

JWT authentication and an active account are required. Routes are available under
both `/api/sharing/` and the existing `/sharing/` API alias.

- `GET /sharing/`: real contacts, incoming/outgoing shares, current identity, and
  per-plant revision numbers.
- `PUT /sharing/`: atomically replace recipients for each selected owned plant.
  Plants omitted from the request are untouched.
- `DELETE /sharing/{share_id}/`: owner revokes this grant, or its recipient leaves.

Every successful mutation returns the same snapshot as GET. Example update:

```json
{
  "updates": [
    {
      "plant_id": 12,
      "expected_revision": 0,
      "recipients": [
        {"contact_id": 7, "can_complete_tasks": true, "ends_on": "2026-12-31"},
        {"contact_id": 9, "can_complete_tasks": false, "ends_on": null}
      ]
    }
  ]
}
```

Use the revision from the GET snapshot used to build the form. A stale revision
returns 409 `conflict`, with no partial changes. The mobile form keeps its draft
and requires an explicit reload before retrying. Reload replaces the selected
plants' recipient choices with the latest server values. Dates are inclusive in
the owner's configured notification timezone; the resulting UTC expiry stays
fixed until the end date is explicitly changed. Expired outgoing grants remain
visible to their owner; recipients see only active grants.

Removing a contact removes grants in both directions and advances affected
plants' revisions. Re-accepting a contact invitation does not restore old access.
Inactive owners/recipients and mismatched contact relationships grant no access.
Sharing writes also have a per-user limit of 20/minute, alongside global limits.

## Shared reads and completion

Plant lists/details, authenticated QR lookup, reminder/task lists, journals, and
reading-device/chart reads use the same active-access rule. Responses include:

```json
{"access":{"is_owner":false,"is_shared":true,"can_edit":false,"can_complete_tasks":true,"owner":{"id":"1","name":"Alice"},"expires_at":null}}
```

Device credentials, setup code, device notes, account secrets, pump actions,
configuration, exports, and deletion remain owner-only. Shared device responses
are explicitly restricted to reading-related fields, independent of a concurrent
access-metadata lookup. Local photos stay on their owner's phone; recipients use
the existing catalogue images when available.

Caregivers complete the same canonical reminder task as the owner. Completion
locks owner/actor users in ID order, then plant, reminder, task, and progression.
It rechecks access under those locks, records `completed_by`, awards XP to that
actor once, and keeps recurrence owned by the plant owner. Existing completed
rows are backfilled with their known pre-sharing owner. Completed history and
idempotent completion responses remain scoped to the immutable event plant,
even if a reminder is later moved to another plant.

## Deployment and validation

Apply `sharing.0001_initial` and `reminders.0006_remindertask_completed_by` through
the existing backend migration step before installing the connected mobile build.
Tests include grants, atomic updates, stale forms, timezone expiry, revocation,
permissions, credential sanitization, task concurrency, and actor XP. PostgreSQL
locking tests skip on SQLite; run them against a PostgreSQL test database to
exercise actual row locks. Local tests do not contact production or send mail.
