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

Plant lists/details, authenticated QR lookup, task lists, journals, and
reading-device/chart reads use the same active-access rule. Responses include:

```json
{"access":{"is_owner":false,"is_shared":true,"can_edit":false,"can_complete_tasks":true,"owner":{"id":"1","name":"Alice"},"expires_at":null}}
```

Device credentials, setup code, device notes, account secrets, pump actions,
configuration, exports, deletion, and reminder definitions remain owner-only.
Shared task responses include their plant ID and task type so Home does not need
access to the owner's reminder definitions. Shared device responses
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

## Scheduled caregiver reminders

Scheduled caregiver reminders are controlled separately in Profile → Notifications
under Email and Phone. The `email_shared_due` and `push_shared_due` Profile fields
default to false and include due-today tasks on plants shared with that user.
They work independently of own-plant daily summaries and use the same channel
delivery time and recipient timezone. A channel sends one combined due-today
summary according to the own/shared scopes selected for that channel.

Any active visible share, including view-only access, can contribute tasks. The
scheduler and sender both check active sharing, canonical task ownership, pending
status and active reminders. Revoked/expired access, removed contacts and disabled
accounts stop shared tasks contributing to notifications. The next-day follow-up
remains limited to tasks on plants owned by the recipient.

## Caregiver completion notifications

Owners independently enable email and push in Profile → Notifications → Shared.
Both default to false. `GET/PATCH /profile/notifications/` exposes
`shared_task_email` and `shared_task_push`. These account-wide preferences apply
to every plant the owner shares, independently of daily summary settings.
The sharing form/API do not store or change notification consent.
Only a newly completed task by an authorized caregiver queues notifications;
owner completions and repeated completion requests do not queue additional work.

The completion transaction creates one durable outbox record per task/channel.
After commit, Celery dispatches it; the minute-based beat sweep recovers broker
outages and retries failed channels. Workers recheck preferences and owner status,
use conditional claims, and skip records older than 24 hours. Push targets active
Android and iOS devices; email and push open the affected plant's task history.
SMTP/FCM acceptance cannot commit atomically with the database: a worker crash
after provider acceptance may still cause a repeat when its lease is recovered.

Task history exposes `completed_by: {id, name}`. Requesters see their own name/email,
and accepted contacts see their private alias or the actor's name/email. Unrelated
caregivers see only a public name/Flovers ID. The mobile history shows this actor
in a third metadata row, and displays saved notes without expansion controls.

## Deployment and validation

Apply `sharing.0002_sharedcarenotification` and
`profiles.0017_profilenotifications_shared_task_email_and_more`, followed by
`profiles.0018_profilenotifications_shared_due`, before
starting the updated web/worker/beat containers. Existing notification preferences
remain off until an owner opts in. Keep the Celery worker and beat running for
delivery and recovery; no additional notification service is needed.

Apply `sharing.0001_initial` and `reminders.0006_remindertask_completed_by` through
the existing backend migration step before installing the connected mobile build.
Tests include grants, atomic updates, stale forms, timezone expiry, revocation,
permissions, credential sanitization, task concurrency, and actor XP. PostgreSQL
locking tests skip on SQLite; run them against a PostgreSQL test database to
exercise actual row locks. Local tests do not contact production or send mail.
