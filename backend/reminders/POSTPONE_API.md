# Postpone a pending task

`POST /api/reminders/tasks/<task_id>/postpone/` requires authentication and plant ownership. Caregivers can complete tasks when permitted but cannot postpone them.

```json
{"due_date": "2026-11-04", "expected_due_date": "2026-11-01"}
```

Both dates use YYYY-MM-DD. The task must be pending and its reminder active. The new date must be later than the current due date and cannot be in the past (the same calendar-day policy used by task completion). The expected date protects against stale clients.

Success returns the existing task serializer (200). An identical retry is idempotent. Invalid dates return 400, stale or unavailable tasks return 409, and inaccessible/deleted tasks return 404. Clients should reload after 404/409 rather than resubmit an old date. No database migration is required.

The operation locks the existing plant, reminder and task in the same order as completion. It updates only the task due_date and updated_at. It neither edits the reminder start date/interval nor creates another occurrence, completes anything, awards XP, or emits a completion notification. Due-task notification queries use the updated date.

Reminder recurrence retains the existing completion-based policy: when the postponed task is eventually completed, the next occurrence is computed from the actual completion date and the unchanged reminder interval. Postponement does not introduce a separate recurrence anchor.

The mobile action appears immediately below Mark as complete on Home task tiles and pending-task rows in Plant details. One shared modal provides tomorrow/two-day/three-day shortcuts relative to today, manual entry in the profile date format, and the native date picker. Shortcuts that would bring the task forward are disabled.
