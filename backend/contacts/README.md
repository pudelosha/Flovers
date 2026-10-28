# Contacts: backend and mobile integration

Contacts are persistent and authenticated. Plant sharing remains the separate,
clearly labelled UI preview; accepting an invitation does not grant plant access.

## API

All routes are available under `/api/contacts/` and the existing `/contacts/`
alias. JWT authentication and an active account are required.

| Method | Route under `/contacts/` | Body | Action |
| --- | --- | --- | --- |
| GET | `/` | | Current identity, accepted contacts, invitations, counts |
| POST | `invitations/` | `{ "identifier": "email or FL-ID" }` | Invite an existing active account |
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
    "counts": { "contacts": 0, "incoming": 0, "outgoing": 0 }
  }
}
```

An invitation contains `id`, `contact` (the same identity shape), and `direction`
(`incoming` or `outgoing`). Pending identities withhold the email address until
acceptance. If no public name exists, they display the Flovers ID instead.

Email and Flovers-ID lookup is case insensitive. IDs are permanent UUID-backed
`FL-<32 hex digits>` values; dashes are optional on input. Account email changes
do not change IDs. Invitations appear inside Flovers; this feature sends no mail.

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
from this same state. All twelve existing mobile languages are included.

Deploy the backend migrations before installing the connected mobile build.
No production deployment or real-user invitations are performed by local tests.
