# Notification inbox

`/api/profile/inbox/` (also `/profile/inbox/`) is authenticated and owner-only.
Rows contain a semantic event snapshot, UTC timestamp, source (task/pump/device/user)
and channel (email/push/in_app). The app translates the event at display time.
Tokens, private links, recipient email addresses and provider responses are never
copied into inbox payloads.

GET accepts source, channel, from_date, to_date, timezone, sort (date/source/channel)
and direction (asc/desc). Signed, owner/query-bound keyset cursors return 30 rows
per page with a frozen maximum ID. Sorting, date filtering and pagination happen
on the server. Day boundaries use the requested IANA timezone.

DELETE `inbox/{id}/` hides one own item. POST `inbox/delete/` accepts a signed
snapshot from GET, scope (all/filtered) and filters. Only rows at or before the
loaded snapshot can be removed, preserving new arrivals during confirmation.
Deletion is soft: the unique user/event/channel key remains to prevent retries
from recreating deleted notifications. It never deletes source tasks, requests,
mail or another user's history.

Contact invitations and acceptances are recorded in-app in the same transaction
as their relationship change. Existing daily task, shared-care and missing-reading
outboxes record successful delivery under their claim fence, atomically with the
sent transition. Pump and moisture alerts are recorded only after their provider
reports success. Email/push preferences and delivery schedules are unchanged;
contact requests are truthfully labelled in_app rather than implying a push send.
Push dismissal has no effect on server history. Separate email/push deliveries
appear as separate entries.

Migration profiles.0021 creates the inbox. Migration profiles.0022 imports pending
contact requests and retained successful daily-task, shared-care and missing-reading
logs. It does not invent historic pump/moisture notices or provider message content
that was never stored. Imported entries use generic localized descriptions and
actual stored timestamps. Future entries include the available actor/plant/device
snapshot. Account deletion cascades inbox removal; no source access is granted
by the presence of an inbox entry.

The mobile Notifications route is a hidden Home child, reached through the final
Home FAB action. It preserves the bottom tabs, uses shared modal geometry and
loading controls, and supports sorting, filters, safe bulk/single deletion,
retry, pull-to-refresh and incremental pagination in both themes and all languages.
