# Task Journal feed

Deploy the backend and run migrations before distributing the updated mobile app.
The existing deployment pipeline runs migrations automatically. This change adds
indexes in `reminders.0007` and `plant_instances.0009`; existing data is preserved.
Legacy task and journal-photo endpoints remain available for older clients.

All endpoints below require an authenticated, active account. Visibility is
rechecked on every request, including subsequent pages. Recipients can read only
entries for plants with current accepted, unexpired sharing access. Completed
tasks use their immutable completion-event plant, not a reminder's current plant.

## GET /journal/entries/

Returns `{results: [{kind: "task"|"photo", data: {...}}], next_cursor, can_manage_tasks}`.
Results combine completed tasks and photo entries. No count or complete collection
is downloaded. The default page size is 30; `limit` accepts 1-100. Each source query
fetches at most `limit + 1` rows before merging. Related records are batch-loaded.

Optional filters: `plantId`, `location`, comma-separated `types` (`watering`,
`moisture`, `fertilising`, `care`, `repot`, `photo`), `completedFrom`, `completedTo`.
Dates are inclusive calendar dates in `timezone` (default `Europe/Warsaw`). Photo
filtering and ordering use upload time, not the optional photo date.

Sorting: `sortKey=completedAt|plant|location`, `sortDir=asc|desc`. Defaults are
`completedAt` and `desc`. Case-insensitive name sorting uses a deterministic
collation and date/kind/identifier tie breakers across both sources.

Pass the returned `next_cursor` with exactly the same query to obtain another
page. Signed cursors are bound to the user, filters, sorting and page size, expire
after 24 hours, and capture an initial server-time cutoff. New entries and later
backdated task completions do not enter that paging session. Deletions, edits and
access changes remain live; refresh to start a new session after changes. Invalid,
expired or mismatched cursors return 400. The mobile pull-to-refresh starts fresh.

`can_manage_tasks` checks the entire filtered task collection, not just the current
page. Task exports and bulk deletion continue using their dedicated server-side
endpoints; neither is limited to loaded pages, and photos are never bulk-deleted.

## GET /journal/options/

Returns lightweight whole-journal `plants` and `locations`, `owned_plants` for the
photo form, and owner-only `delete_plants`/`delete_locations` for task deletion.
Plants have only id/name; owned plants also have location. This metadata is fetched
once on screen entry/return or refresh and reused when filtering and loading more
pages. The screen makes no duplicate full plant-list requests.

## GET /journal/photo-availability/

Returns only `{availability: [{plant_id, next_photo_at}]}` for owned plants. Opening
the photo editor no longer downloads all journal photos just to check the weekly
per-plant cooldown. Photo creation still enforces the existing server-side limit.

## Mobile behavior

Initial data and first-page photo preparation use the shared spinner. Scrolling
appends older pages with a small footer spinner, preserving rendered tiles and
scroll position. Duplicate end-of-list events are coalesced; failed pages retain
the current list and offer retry. New criteria, refresh, navigation or unmount
invalidate outstanding requests so stale responses cannot overwrite current data.


## Photo preview navigation

`GET /journal/photos/<uuid>/?navigation=1` returns the usual authorized photo
metadata plus `navigation: {previous_id, next_id}`. Previous means older and Next
means newer, ordered by upload time and UUID to break timestamp ties. Both IDs
are nullable. Each neighbor lookup fetches at most one ID using the existing
plant/upload-time/id index. No complete photo collection is downloaded, and
navigation is independent of journal filters and currently loaded feed pages.

Only photos of the same plant with current access are eligible. Each subsequent
preview request and private-image request checks authorization again. Revoked or
expired sharing cannot be used to continue viewing photos. A missing/deleted photo
returns 404. The optional query preserves the existing detail response for old
clients; new mobile clients also accept older backends without navigation metadata.

The preview uses the shared full-screen modal, waits for fresh metadata and image
loading, shows the upload date and local time below the image, and places equal-width
Previous/Next buttons above Close. Single-photo navigation is hidden, unavailable
directions are disabled, and reopening starts at the originally selected photo.
