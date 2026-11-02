# Contacts: backend and mobile integration

Contacts are persistent and authenticated. Plant sharing is implemented separately
in [sharing](../sharing/README.md); accepting an invitation alone does not grant
plant access.

## API

All routes are available under `/api/contacts/` and the existing `/contacts/`
alias. JWT authentication and an active account are required.

| Method | Route under `/contacts/` | Body | Action |
| --- | --- | --- | --- |
| GET | `/` | | Current identity, accepted contacts, invitations, counts |
| POST | `invitations/` | `{ "identifier": "email or FL-ID" }` | Invite an existing active account |
| POST | `email-invitations/` | `{ "email": "new@example.com", "language": "pl" }` | Email someone who has not registered |
| DELETE | `email-invitations/{id}/` | | Sender cancels an invitation to register |
| POST | `invitations/{id}/accept/` | `{}` | Recipient accepts; safe to retry |
| DELETE | `invitations/{id}/` | | Recipient declines or sender cancels a pending invitation |
| PATCH | `{other_user_id}/` | `{ "name": "Mom" }` | Change the name visible only to the caller |
| DELETE | `{other_user_id}/` | | Remove the accepted contact for both participants |

Every successful mutation returns the same snapshot as GET:

```json
{
  "status": "success",
  "message": "Contacts fetched.",
  "data": {
    "current_user": { "id": "1", "name": "Alice", "email": "alice@example.com", "flovers_id": "FL-0123456789ABCDEF0123456789ABCDEF" },
    "contacts": [],
    "invitations": [],
    "email_invitations": [],
    "counts": { "contacts": 0, "incoming": 0, "outgoing": 0 }
  }
}
```

An invitation contains `id`, `contact` (the same identity shape), and `direction`
(`incoming` or `outgoing`). Pending identities withhold the email address until
acceptance. If no public name exists, they display the Flovers ID instead.

Email and Flovers-ID lookup is case insensitive. IDs are permanent UUID-backed
`FL-<32 hex digits>` values; dashes are optional on input. Account email changes
do not change IDs. Existing-account invitations appear inside Flovers and send no mail.
The separate email-invitation flow below sends an invitation to register.

Validation errors include a stable `code`: `invalid`, `self`, `notFound`,
`alreadyContact`, or `alreadyPending`. Missing/nonparticipant objects return 404;
existing relationships return 409 on duplicate invitations. Invitation creation
also has per-user limits of 20 requests/hour and 100/day, in addition to the
existing global throttles. Invalid lookups count toward these limits.

## Storage and permissions

`accounts.0003_user_flovers_id` backfills a distinct public ID for every existing
account before enforcing the non-null field. `contacts.0001_initial` adds one
sorted user-pair relationship, with database constraints against duplicate pairs,
self-connections, and unrelated initiators. Either participant may remove an
accepted contact; only the recipient may accept an invitation. Renaming changes
only the caller's private alias.

All relationship mutations lock both user rows in ID order, including before
creating an initial relationship. This serializes reversed invitations and later
changes on PostgreSQL. SQLite tests exercise lifecycle and constraints but cannot
verify PostgreSQL row locking; `test_concurrency.py` runs those checks on a
PostgreSQL test database and skips them on SQLite.

The mobile Contacts provider keeps no sample contacts, refreshes on focus and
foreground, polls while the Contacts screen is open, and discards responses from
older login sessions. Mutations wait for server success and use the returned
snapshot. Errors keep dialogs/data intact and expose retry. Profile counts come
from this same state. All 15 supported mobile languages are included.

Deploy the backend migrations before installing the connected mobile build.
No production deployment or real-user invitations are performed by local tests.

## Invitations to register

Profile ? Contacts ? FAB ? Invite by email opens the standard contact dialog.
The language defaults to the sender's profile language and can be changed without
changing profile preferences. The recipient receives branded HTML/plain-text
instructions in that language, the inviter's name and Flovers ID, and a localized
website link. There is no account creation or automatic plant access.

`contacts.0002_emailinvitation` stores one case-normalized email per sender. The
address must not belong to any existing account, including an unverified account;
otherwise the server returns `alreadyRegistered` (409), directing the user to
Add contact. Duplicates return `alreadyPending` (409). Invalid email/language
returns `invalid` (400). The existing hourly/daily contact throttles also apply.
An address can receive at most three invitations per day across senders; a sender
cannot bypass a 24-hour resend limit by cancelling. A successful request returns
201 with the existing snapshot and queues delivery; it does not wait for SMTP.
The existing configured mail service is used by the background worker.

Invitations expire after 30 days. Pending emails are visible only to the sender
in `email_invitations`: `id`, `email`, `language`, `expires_at`. Existing API
`invitations` and counts retain their previous meaning for old clients. The new
mobile parser merges pending emails into the pending list/counts and labels them
Waiting for registration. Email invitation IDs are prefixed `email:` only in the
mobile state and routed to their own cancellation endpoint.

After registering with the same email and verifying it, the recipient's first
contacts refresh converts every unexpired, uncancelled invitation into an incoming
contact request. Each still needs acceptance. Existing connections are preserved;
claiming is idempotent. Cancelled/expired invitations cannot be claimed. Sender
account deletion cascades invitation removal. Closed rows retain delivery history
to enforce resend limits. No future reminders or follow-up marketing are sent.

Optional environment variables (blank by default; no placeholder URLs appear in
emails):

- `INVITATION_GOOGLE_PLAY_URL`: actual Google Play listing or testing link.
- `INVITATION_APP_STORE_URL`: actual iOS listing when available.

The website link is always available, based on `PUBLIC_WEB_BASE`. Configure the
store links on the VPS when the listings are ready. Run migrations before using
the new mobile build. Tests use local in-memory mail, not real recipients.


## Reliable invitation delivery

Migration `contacts.0003_invitationrecipientlock_and_more` adds a transactional
outbox and recipient lock rows. Every accepted invitation and its delivery job
commit together. The request makes no SMTP or broker calls, so neither outage
causes invitation loss or HTTP latency. Celery Beat dispatches
`contacts.tasks.deliver_invitation_emails` every minute; a running worker is required.
The existing deployment must restart both worker and Beat after migrating.

A sender row lock serializes reservations across different recipient addresses.
A separate SHA-256 recipient-key row lock serializes reservations across different
senders, including the first invitation to an address. PostgreSQL enforces these
locks. Queue reservations count toward rolling limits immediately, even if mail
is delayed, cancelled or fails: 20/hour and 100/24 hours per sender, three/24 hours
per normalized recipient, and one per sender/recipient per 24 hours. Live jobs
retain reservations throughout outages; delivered jobs count from actual send
time, preventing catch-up bursts when mail resumes. Legacy sent
records count too. Existing cache-based API throttles remain an additional layer.

Workers use atomic claims, a 15-minute fenced lease and a generation ID. A live
claim cannot be picked by another worker; expired claims can be recovered. Old
workers cannot overwrite newer claim results. SMTP runs outside transactions;
`sent_at` is recorded only after provider acceptance. Retries back off from 60
seconds and stop after six attempts. Inspect pending/failed delivery rows for
operational monitoring; failure details retain only the exception class.
Cancelled, expired, claimed, obsolete-generation and inactive-sender invitations
are skipped, as are addresses registered before delivery.

Delivery is at least once: a worker crash after SMTP accepts the email but before
the database records success may produce a duplicate after lease recovery. SMTP
cannot provide exactly-once delivery. Cancellation cannot recall an email already
in flight. Invitations never automatically grant contact or plant access.
