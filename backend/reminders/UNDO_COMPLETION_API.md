# Undo completion

Deploy migrations `reminders.0008` and `profiles.0019` before enabling this feature. Existing historical completions intentionally remain ineligible: their exact generated successor and original note were not recorded, so inferring eligibility would risk deleting later work.

The bounded Task Journal feed includes `undo_completion: UUID | null` on task entries. It is a server-owned completion-generation token, not an authorization credential. Photos never include it. Page eligibility uses two bounded queries for reminder/latest-completion and pending-task snapshots; filtering a page cannot make an older task eligible.

`POST /api/reminders/tasks/<id>/undo-completion/`

```json
{"expected_completion":"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}
```

Only the current active owner may undo. The operation rechecks the token, latest completion for this reminder (not the whole plant), reminder identity/settings/activity, completion receipt and exact pending successor. Completion-based due dates may be backdated; latest completion uses the server receipt timestamp and ID, not a client date. Any changed, completed, deleted/recreated or postponed successor blocks undo. Reminder edits/pause/resume also invalidate the snapshot.

Under the same ordered user -> plant -> reminder -> task locks as completion, undo deletes exactly the recorded pending successor, restores the original task to pending without changing its due date, clears completion identity/event/date and restores its pre-completion note. Reminder configuration is never saved. The completing actor's balance is reduced by the actual awarded amount; the award is marked reversed and excluded from daily quotas. Re-completion reuses the same source-task decision row, reevaluates current caps, and cannot create duplicate active awards. No XP is transferred to the owner when a caregiver's completion is undone.

Success returns the restored task DTO (200). Invalid input returns 400, missing/inaccessible tasks 404 and stale/ineligible completions 409. Repeated requests cannot reverse XP twice. The client closes/reloads on 404/409, retains the confirmation with retry on network/server failures and ignores late callbacks after navigation.

Unclaimed shared-care outbox messages are marked skipped. Already sent or in-flight notifications cannot be recalled; the confirmation explicitly explains this. No undo email/push is sent. Existing source-task/channel delivery deduplication prevents repeated completion/undo cycles from resending the same notification.

Mobile: Task Journal's eligible owner task submenu opens the shared full-screen modal frame, with centered content, standard top-right X, scrolling and bottom-bar reservation. Confirm/Cancel share the width equally. Success reloads Journal; Home/calendar and Profile fetch restored tasks/balance on focus. Older backends omit the token, so newer clients hide Undo safely until deployment.
