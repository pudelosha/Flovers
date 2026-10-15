**Stage 2 repairs — 15 October 2026**

The confirmed critical-flow findings have been repaired in the working tree. This file describes the code changes and rollout requirements; the application has not been deployed, and the project database has not been migrated by this work.

**Accounts and permissions**

- Reminder and reading-device create/update reject another user's plant. Reads, task operations, exports and hardware credential lookups also exclude malformed legacy ownership relationships.
- Requests, refreshes and persisted authentication writes are bound to their session. Late successes, failures and 401 responses from an old session cannot restore it or sign out a newer account.
- Password reset/change invalidates prior access and refresh tokens. Activation tokens have a separate purpose and become invalid after activation.
- Signup preserves supported languages, including Japanese and Korean. Signup/reset validation and translated password guidance now require eight characters.
- Email changes update cached mobile identity.

**Plants, reminders and history**

- Watering and misting have separate intervals through mobile payloads, storage and generated reminders. Old mobile requests that omit the new watering field retain their previous fallback; explicit null/zero watering intervals are rejected.
- Zero reminder intervals are rejected by serializers, guarded by model methods and prohibited by a database constraint.
- A reminder's first due date can be today. Wizard-created automatic reminders explicitly start after their selected interval. Existing task dates are not shifted by migrations.
- Editing a reminder reschedules its pending task without fabricating a completed-care entry. Unchanged edits preserve the existing pending task.
- Date-only values round-trip without UTC conversion in reminder edit forms. Completed history remains visible when its reminder is paused.
- Species guidance and pot/soil recommendations survive client serialization.
- Failed creation offers retry/back behavior; a photo persistence retry reuses the already-created plant. Reentering the wizard preserves in-progress recovery.
- Photo replacement finalizes a new version before removing the old one; failed replacement preserves the existing photo.

**Devices, notifications and website**

- Generated firmware honors the device sampling interval.
- Updated firmware opts into manual-task redelivery, records an execution receipt in ESP32 flash before watering, and repeats acknowledgements without repeating the pump run. Legacy firmware remains one-shot to avoid unsafe duplicate execution. Failed/completed acknowledgements are idempotent.
- Logout unregisters the current push token; local token deletion is the fallback if server cleanup fails. Initialization can recover from transient failures and stop/start races. Foreground Android notifications have a press action.
- A separate public contact endpoint accepts validated sender email, subject/message and language, with throttling and a honeypot. Authenticated account support remains protected.
- Authenticated navigation can receive recovery/activation links. iOS module registration and custom URL forwarding match the registered app. The website's firmware example can be checked/regenerated from the backend generator with placeholder credentials.

**Database and release requirements**

Run the four new migrations as part of backend release, after the usual database backup:

1. plant_instances/0004_plantinstance_water_interval_days
2. reminders/0004_positive_reminder_interval
3. profiles/0011_supportmessage_public_sender
4. profiles/0012_profilesettings_japanese_korean

The watering migration uses an owner-matching existing watering reminder where available, otherwise the old interval. Invalid zero-interval reminders are paused with a valid placeholder interval; their pending tasks are removed and completed history retained. Select a proper interval before resuming any such reminder.

Existing JWT sessions must log in once after release. Previously issued activation links need to be resent. Password-reset links retain their existing purpose.

Regenerate and upload firmware to devices to receive the interval and retry improvements. Older installed sketches cannot acquire these changes from a backend update alone. Persistent execution receipts use [ESP32 Preferences](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/preferences.html).

**Validation**

Regression tests cover ownership boundaries, legacy malformed rows, token/session races, recovery, migrations, date/history behavior, independent intervals, creation recovery, photo replacement, push lifecycle and public contact.

Backend verification uses isolated in-memory SQLite settings with external email, push and model inference mocked; project .env files and the project database are untouched. Generated pump code is compiled and executed against host substitutes for flash/network/pump I/O, including lost replies, reboot/interruption and storage failures. This is not a physical ESP32 test.

Final verification:

| Check | Result |
|---|---|
| Backend suite, including compiled firmware host check | 376 passed |
| Mobile Jest suite | 94 passed across 29 suites |
| Web contact Node tests | 2 passed |
| Website production build | Passed; temporary output and empty environment directory |
| Django system check | No issues |
| Migration consistency check | No unrecorded model changes |
| Website firmware example parity | Matches backend generator |
| TypeScript comparison with original commit | 452 original diagnostics, 449 remaining; none introduced |

TypeScript was compared against 678 tracked files reconstructed from original commit 42b369fcc8e188d381c89ac1e2f49423d3c5e39e, using the same installed dependencies/compiler. The remaining 449 diagnostics are existing project debt; the project-wide type check still fails and is not presented as green.

Native Android/iOS builds, live email/FCM delivery, PostgreSQL concurrency and deployed-host routing still require their corresponding environments. Existing unfinished features, such as account deletion and placeholder screens, were not implemented by this repair pass. Previous-care selections remain stored metadata; changing their scheduling meaning requires a product decision.
