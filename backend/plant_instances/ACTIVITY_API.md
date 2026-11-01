# Recent plant activity

`GET /api/plant-instances/<id>/` includes `recent_activity`: up to five completed care tasks, ordered by completed_at descending then task ID descending. Each row contains only id, backend task type, completed_at and completed_by ({id, name} or null). Notes and undo metadata are omitted.

This is a read-only summary, not a new activity log. Pending/cancelled/undone tasks, photos and physical pump jobs are excluded. Unknown/deleted actors are not attributed to the owner.

Existing detail access checks and task visibility rules apply, including share expiry/revocation. Filtering uses the immutable completed-event plant ID, not the reminder's current plant. Attribution reuses Task Journal's viewer-specific contact aliases and privacy policy, avoiding disclosure of unrelated caregiver email addresses. The query is limited in SQL before serialization and loads related actor/plant data together.

Mobile: the Activity tile is second, beneath plant information, using the existing glass frame. Rows show actor, localized care type and local date/time in the profile date format. There are no menus, buttons, notifications or preferences. Empty activity has a localized message. The array travels with the existing detail response, including the QR-to-detail route, and participates in the initial spinner without another activity HTTP request. Focus and existing completion refreshes reload it.

Backend deployment required; no migration. Older responses omit the optional field and clients handle it safely as empty. Labels and website documentation cover all 15 languages.
