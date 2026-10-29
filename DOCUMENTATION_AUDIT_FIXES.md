# Documentation audit corrections — 29 October 2026

Implemented the corrections from `flovers-documentation-audit-2026-10-29.md` against source snapshot `993baccb00de10f0e8627d07fa5301b0c0837d00`. This includes application fixes where the documentation promised missing behavior, and documentation corrections where the existing behavior was intentional. Earlier uncommitted feature work has been retained.

Updated 210 website documentation bundles across English, Polish, German, Italian, French, Spanish, Portuguese, Arabic, Hindi, Chinese, Japanese, Korean, Indonesian, Russian and Turkish. New application messages are also localized in all 15 languages.

| Finding | Implemented resolution |
| --- | --- |
| F01 — Account deletion | Implemented authenticated `DELETE /auth/account/` with current-password confirmation. Owned plants are deleted before the user to satisfy protected location relationships; deletion is atomic. Contacts' plants and care history remain. The deleted user's access and refresh tokens stop working. Mobile removes the deleted account's local plant photos and logs out after success. Failure preserves the account/session. |
| F02 — Firmware and manual duration | Synchronized the website firmware with the backend generator. Protocol examples advertise `supports_manual_duration` and return `duration_seconds`. All languages document manual duration of 1–300 seconds and distinguish it from automatic watering's uploaded `PUMP_RUN_MS`. |
| F03 — Password policy | Documentation now matches the existing 8–128-character validation without a mandatory number or special character. No composition requirement was introduced. |
| F04 — Inactive login | Preserved `account_not_activated` through the backend response and mobile error handling. Correct credentials for an inactive account show activation guidance; incorrect credentials retain a generic error. |
| F05 — Notification timing | Documentation describes one delivery time per channel, yesterday's unfinished owned tasks, independent follow-up controls, and the distinction between scheduled summaries and shared-care completion events. |
| F06 — Reminder deletion | Added an explicit, localized confirmation warning and documentation that deleting a reminder also deletes completed tasks and notes. Existing cascading deletion is retained; pausing is the alternative for retaining history. |
| F07 — Future tasks on Home | Explained that All includes future pending tasks, reminders immediately create their next pending task, and empty states depend on the selected view and filters. |
| F08 — Task interactions | Home instructions now describe tapping the tile body to open its menu. Task History documentation matches the current always-visible notes and body-tap action menu. |
| F09 — Bulk completion | Explained permission filtering, one shared completion date/note chosen before submission, and the absence of later note editing. |
| F10 — Wizard completion | Replaced the nonexistent review/Open plant flow with automatic creation at Step 09 and return to Plants after approximately 2.5 seconds. |
| F11 — Exposure defaults | Disclosed bright indirect light, East and 20 cm when skipped. Leaving these defaults untouched alone does not retune care intervals. |
| F12 — Reading navigation | Instructions specify tapping a measurement value/icon, rather than the readings tile title/background. |
| F13 — Device interval | Restored a bounded interval control for 1–24 whole hours. Documented regeneration and upload of firmware after a change, plus the distinction between default/generated and custom sampling rates. |
| F14 — Automatic pump cooldown | Added the device-form cooldown setting and API payload handling. Valid range is 1–32767 minutes, default 60, matching the portable database field limit. Documentation identifies `AUTO_PUMP_MIN_INTERVAL_MS` as a local fallback rather than the normal online setting. |
| F15 — Temperature units | Added one shared Celsius/Fahrenheit/Kelvin conversion utility used by reading tiles, Plant Details latest readings and historical charts, including unit labels. Missing samples remain missing through conversion. |
| F16 — Historical navigation | Documentation allows empty past periods and explains that future navigation is blocked. |
| F17 — Activation resend | Directs users to the link on Login, including returning there after registration. |
| F18 — Registration links | Added the localized Privacy Policy link alongside Terms in the registration agreement. Links do not toggle the agreement checkbox. |
| F19 — Plant photos | Clarified that removing a local custom photo restores the catalogue image when one is available. |
| F20 — QR references | Replaced the numeric database-ID claim with a unique, opaque plant reference. Existing authorization requirements remain documented. |
| G01 — Caregiver notifications | Documentation matches the implemented global due-task preferences under Email/Phone and owner completion-event preferences under Shared. View-only shared tasks may be included in opted-in due summaries; access is rechecked before delivery. |
| G02 — End-date scope | Explained the scope across checked recipients and selected plants, preservation of untouched differing dates, and access removal when an existing contact is unchecked. |
| G03 — iOS light readings | Documented manual light selection on iOS and automatic measurement only on supported Android hardware. |
| G04 — Manual request expiry | Documented expiry after two hours for an uncollected manual watering request. |
| G05 — Recurrence anchor | Explained the selected completion date and advancing intervals until the next occurrence is strictly after today. |
| G06 — Duplicate reminders | Documented one reminder per plant and care type; edit the existing reminder instead. |
| G07 — History export | Documented the owner-only Send export action, current filters and optional pending tasks. |
| G08 — Plant filters | Documented both location and linked definition's Latin name. |
| G09 — Language lists | All FAQ language lists now include all 15 supported languages using their localized display names. |
| Missing historical samples | The history API now returns `value: null, sample_count: 0` for an empty bucket and preserves genuine zero values with a positive sample count. Charts display missing samples as gaps and actual zeros as values. Legacy zero-only responses remain treated as gaps because they cannot distinguish the two cases. |

Validation completed:

- Backend: **702 passed, 29 skipped** under isolated settings with an in-memory database, local email outbox and external network access disabled. Includes account deletion, rollback/ownership checks, token invalidation, history gaps/zeros and cooldown boundary/persistence cases.
- Mobile: **353 passed** across 57 suites. Includes account/auth flows, duration/device controls, conversions, charts, existing sharing and notification behavior.
- Website: **21 passed**; production Vite build succeeded. Verified all 35 correction strings in every locale, valid documentation structure and complete localized FAQ language lists.
- Firmware generator/public example parity check passed.
- Django system check passed; migration drift check reported no missing migrations.
- Standalone Android release APK built successfully for arm64. SHA-256: `d3444ae0db36d11d19f102e43c66d0610faef3151eaca8b1df485bd3029e7cd6`.
- TypeScript still reports 340 existing diagnostics, down from the earlier 341 baseline. No new diagnostics were introduced by these audit fixes; this does not claim a clean project-wide type check.

No commit, push, deployment, live email, physical pump operation, phone installation or iOS runtime validation was performed for this correction task. Backend changes must be deployed before the corresponding mobile functionality can use them. Website build retains its existing bundle-size warning.

Account-deletion caveat: if the authentication session is replaced while deletion is in flight, the API client discards the old response. Server deletion remains committed, but that unusual path can skip cleanup of the old account's local photos. Other accounts' data is not cleared.
