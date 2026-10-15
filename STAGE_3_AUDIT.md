This stage 3 audit reviewed the current backend, mobile app, and web app on 15 October 2026, after the stage 2 fixes. It identified **12 confirmed finding groups**, **3 deployment-dependent risks**, and **1 candidate requiring further UI validation**. Application code was not changed. This report is the only repository file added during this audit.

Follow-up: the findings below record the audit-time behavior. The subsequent implementation and rollout requirements are documented in [STAGE_3_FIXES.md](STAGE_3_FIXES.md).

P1 means fix before the next production release because the issue affects security, watering safeguards, or multiple users. P2 means a confirmed integrity or reliability defect with a more limited impact or a specific triggering condition. These priorities describe remediation order; they do not claim an incident has occurred in production.

| ID | Priority | Finding |
| --- | --- | --- |
| S3-01 | P1 | Generated firmware accepts an unauthenticated TLS server. |
| S3-02 | P1 | Unauthenticated requests can consume a device's quota; legitimate polling also leaves insufficient completion capacity. |
| S3-03 | P1 | Rebooting bypasses the automatic watering cooldown. |
| S3-04 | P2 | Reading ingestion can erase measurements, rewind current state, and acknowledge discarded writes. |
| S3-05 | P1 | One delivery failure can stop notifications for other users, with no recovery on the next scheduled run. |
| S3-06 | P2 | Editing a reminder can move and relabel completed journal events. |
| S3-07 | P2 | Overlapping edits and completions can overwrite newer persisted state. |
| S3-08 | P2 | Concurrent email case variants can create accounts that fail login and recovery lookups. |
| S3-09 | P2 | Retrying plant creation after a lost response can create a duplicate plant. |
| S3-10 | P2 | Overlapping local photo replacements can delete every saved version. |
| S3-11 | P2 | Interrupting logout during push cleanup restores the account on restart. |
| S3-12 | P2 | Accepted text can break spreadsheet exports or become spreadsheet formulas. |

1. **S3-01: Generated firmware disables server certificate verification.**

   Every generated HTTPS POST uses `WiFiClientSecure` followed by `client.setInsecure()`. The same helper sends the account's device secret and receives the instructions used to run the pump. An attacker able to intercept the device's connection could impersonate the API, read those credentials, and supply watering instructions. Encryption alone does not authenticate the server in this configuration. This requires a network interception position; no live interception was attempted.

   Source: [HTTP helper](D:/Projekty/Python/Flovers/backend/readings/codegen.py:568), [pump response processing](D:/Projekty/Python/Flovers/backend/readings/codegen.py:845). The certificate behavior was cross-checked against the [ESP32 implementation](https://github.com/espressif/arduino-esp32/blob/master/libraries/NetworkClientSecure/src/NetworkClientSecure.cpp#L306).

   Fix: verify the server using an appropriate CA certificate or certificate bundle and fail closed on verification failure. Regenerate and install the corrected firmware on existing devices; a backend deployment alone cannot fix installed sketches.

2. **S3-02: Device throttling can be exhausted before credentials are checked.**

   The per-device throttle builds its key from the request's unverified `device_id` or `device_key`. DRF applies it before the view authenticates the device. A caller supplying only a guessed numeric device ID can charge the real device's budget even though every request is rejected.

   Reproduction: one simulated caller made 50 invalid requests, advanced time by 61 seconds to respect the anonymous 50/minute limit, then made 10 more. The next request with valid credentials received **429**. No secret or device key was supplied by the invalid requests. The budget can remain occupied for most of an hour.

   A separate capacity issue uses the same budget: pump polling, pump completion, and reading-feed requests share **60/hour**. Sixty legitimate polls at one-minute intervals leave a completion and feed request returning **429** before the oldest poll expires. The generated firmware polls every minute, so completion traffic needs additional capacity.

   Source: [throttle identity](D:/Projekty/Python/Flovers/backend/readings/throttles.py:19), [configured rates](D:/Projekty/Python/Flovers/backend/app/settings.py:103), [pump polling endpoint](D:/Projekty/Python/Flovers/backend/readings/views.py:988), [poll interval](D:/Projekty/Python/Flovers/backend/readings/codegen.py:173). Ingest uses the same unverified-identity design under its own quota.

   Fix: retain a separate anonymous/IP abuse limit, then charge a device quota only after resolving authenticated device identity. Give telemetry, command polling, and completion acknowledgements suitable independent budgets.

3. **S3-03: Automatic watering cooldown survives only in RAM.**

   `lastAutoPumpMs` starts at zero, and zero means no cooldown. Automatic watering updates this RAM variable after pumping. Startup immediately runs a full cycle, while the backend's automatic configuration does not gate on the recorded last pump time. Restarting therefore permits another watering immediately when moisture remains below the threshold, even if the previous watering was seconds ago.

   Reproduction: compiled the current generated pump helper against simulated I/O. The second automatic call in the same boot was blocked. Resetting the RAM clock/cooldown as on reboot allowed a second 30-second pump run inside the intended one-hour cooldown. This was a host execution, not a physical ESP32 test. Persistent receipts for manual tasks, added in stage 2, do not cover this automatic path.

   Source: [RAM state](D:/Projekty/Python/Flovers/backend/readings/codegen.py:198), [cooldown check](D:/Projekty/Python/Flovers/backend/readings/codegen.py:962), [automatic execution](D:/Projekty/Python/Flovers/backend/readings/codegen.py:1019), [startup cycle](D:/Projekty/Python/Flovers/backend/readings/codegen.py:1188), [backend configuration](D:/Projekty/Python/Flovers/backend/readings/views.py:372).

   Fix: persist automatic-watering safety state before physical execution, recover it conservatively after reboot, and include an authoritative cooldown decision in backend configuration. Define fail-closed behavior for unavailable clock/storage and interrupted watering.

4. **S3-04: Ingestion can destroy or misrepresent valid measurements.**

   Three diagnostic cases reproduced:

   - Upload a dry reading at 12:20, then a delayed wet reading at 10:20. History/feed correctly retains the newer dry reading, but the device snapshot and `last_read_at` rewind to 10:20, and its active low-moisture alert is cleared by the older wet reading.
   - Upload all four metrics, then upload only temperature in the same hour. The accepted second upload replaces humidity, light, and moisture with **null**, erasing the previously saved values. The project's generated PDF explicitly demonstrates temperature-only uploads.
   - Inject a database `IntegrityError` during writing. The request returns **202 / status=ok** despite saving no reading. This is fault injection demonstrating the exception path; a naturally occurring production constraint failure was not established.

   Source: [metric overwrite](D:/Projekty/Python/Flovers/backend/readings/views.py:924), [snapshot/alert update](D:/Projekty/Python/Flovers/backend/readings/views.py:931), [suppressed integrity error](D:/Projekty/Python/Flovers/backend/readings/views.py:979), [partial upload example](D:/Projekty/Python/Flovers/backend/readings/views.py:714).

   Fix: define and validate partial-versus-complete measurement semantics; preserve omitted values when merging partial uploads. Advance snapshots/alert state only for a newer observation, with an explicit same-hour ordering rule. Return an actionable failure for an uncommitted write rather than acknowledging it as successful.

5. **S3-05: Notification failures are not isolated or durably retried.**

   The daily scheduler processes all users in one loop. Email delivery exceptions escape that loop, and eligibility requires the exact configured hour and minute. One failed delivery stops the remaining users; the following minute no longer qualifies them.

   Reproduction: two users were eligible at 12:00. A mocked SMTP failure stopped the run after **one attempt**. Re-running at 12:01 made **zero attempts**, with no delivery rows for either user. A worker outage or queue delay that skips the configured minute also has no catch-up path.

   A separate interleaving reproduced duplicate sends: delivery is logged after sending, so overlapping eligible runs sent **two emails** but retained **one unique delivery record**. Overlap was simulated; multiple schedulers in production were not established.

   Source: [exact-minute matching](D:/Projekty/Python/Flovers/backend/profiles/tasks.py:47), [email helper](D:/Projekty/Python/Flovers/backend/profiles/tasks.py:98), [shared loop](D:/Projekty/Python/Flovers/backend/profiles/tasks.py:252), [send before log](D:/Projekty/Python/Flovers/backend/profiles/tasks.py:263).

   Fix: create durable recipient/channel delivery work, isolate failures, retry eligible unsent work after its due time, and claim work atomically before sending. Provider idempotency can further reduce duplicates; SMTP failures around acknowledgement still require an explicit retry policy.

6. **S3-06: Future reminder edits rewrite the meaning of completed history.**

   Journal membership and care type are read through the mutable reminder, rather than preserved on a completed event. Complete “Watered Plant A,” then edit the reminder to Plant B/fertilizing: the API returns **200**, Plant A's journal becomes empty, and the same completed event appears under Plant B as fertilizing while retaining the note “Watered Plant A.” The mobile editor permits both changes without explaining the historical effect.

   Source: [writable reminder fields](D:/Projekty/Python/Flovers/backend/reminders/serializers.py:11), [derived event type](D:/Projekty/Python/Flovers/backend/reminders/serializers.py:40), [journal membership](D:/Projekty/Python/Flovers/backend/reminders/views.py:543). This is an integrity issue within an owner's data; no unauthorized access is implied.

   Fix: snapshot the event's plant and care type, or version reminder definitions so edits affect future work. Historical correction should be an explicit operation.

7. **S3-07: Transactions do not prevent stale-instance overwrites.**

   Current handlers load objects before the relevant write and later save cached state without checking a version or reloading it under a lock. Deterministic interleavings reproduced:

   - A device settings PATCH loads its object, an ingestion request commits a new snapshot, then the PATCH saves. The successful settings edit restores the old **null snapshot and last-read time**, although the new reading remains in history. API read-only declarations do not prevent saving stale internal fields.
   - Interval changes to **14 days**, then a disjoint pause PATCH loaded earlier silently restores **7 days**.
   - Completion loaded before the interval edit creates the next occurrence using **7 days**, although the persisted reminder now says **14**.
   - A second completion using an old pending instance overwrites an already completed event's original note and completion date.

   Source: [device serializer update](D:/Projekty/Python/Flovers/backend/readings/serializers.py:313), [reminder update](D:/Projekty/Python/Flovers/backend/reminders/views.py:221), [completion fetch](D:/Projekty/Python/Flovers/backend/reminders/views.py:244), [cached completion status](D:/Projekty/Python/Flovers/backend/reminders/models.py:181).

   These proofs replay legitimate overlapping request orderings against original handlers/models. They are not a threaded PostgreSQL concurrency test and do not establish duplicate pending tasks.

   Fix: reload/lock current reminder and task state inside a consistently ordered transaction, condition completion on persisted pending status, and use sparse updates or optimistic versions for settings edits. Ingestion locks alone cannot protect against another writer that ignores them.

8. **S3-08: Email uniqueness differs between validation and the database.**

   Signup checks `email__iexact` before saving; the database enforces ordinary email uniqueness. Validate `Concurrent@example.com` and `concurrent@example.com` before either saves: both rows persist in the isolated database and both activate. Login's case-insensitive `.get()` then raises `MultipleObjectsReturned` and returns **500**. Recovery and resend use the same lookup pattern.

   Source: [signup preflight](D:/Projekty/Python/Flovers/backend/accounts/serializers.py:23), [database field](D:/Projekty/Python/Flovers/backend/accounts/models.py:7), [login lookup](D:/Projekty/Python/Flovers/backend/accounts/serializers.py:85), [recovery lookup](D:/Projekty/Python/Flovers/backend/accounts/views.py:177).

   Condition: overlapping validations or another write path bypassing the preflight. PostgreSQL deployment collation was not inspected. No account takeover was demonstrated.

   Fix: enforce the same canonical/case-insensitive identity rule in the database and all writers, handle uniqueness races, and reconcile any existing collisions deliberately.

9. **S3-09: Plant creation retries lack server idempotency.**

   The wizard remembers an ID after receiving the create response. If the server commits but the response is lost, the 15-second client timeout leaves that ID unknown. “Try again” submits the same creation again. The original-module probe produced plant IDs **1 and 2** from identical payloads, with the wizard recognizing only **2**. Enabled generated reminders can be duplicated under the separate plants.

   Source: [wizard create](D:/Projekty/Python/Flovers/mobile/src/features/create-plant/context/CreatePlantProvider.tsx:290), [client timeout](D:/Projekty/Python/Flovers/mobile/src/api/client.ts:221), [create service](D:/Projekty/Python/Flovers/mobile/src/api/services/plant-instances.service.ts:60), [backend creation](D:/Projekty/Python/Flovers/backend/plant_instances/serializers.py:104).

   Fix: retain a creation identifier for the draft and enforce backend idempotency, returning the original result on retry. The stage 2 photo-only retry fix remains useful but cannot recover an unknown server-committed ID.

10. **S3-10: Closing a pending photo save can allow mutually destructive replacements.**

    Trigger: Save A while native storage is delayed, use X/backdrop, discard, reopen the same plant, and Save B before A finishes. X/backdrop remain active while saving. Discard closes without cancelling or joining the write, and reopening resets loading independently. Each promotion later deletes every other version for the plant. Two overlapping cleanup snapshots can therefore delete each other's new file and the previous photo.

    The original-helper probe returned **two successful photo URIs, with zero photos remaining**. The UI path was checked in source; native timing was simulated. Ordinary double tapping the disabled Save button is not the claimed trigger.

    Source: [close behavior](D:/Projekty/Python/Flovers/mobile/src/features/plant-details/components/modals/ChangePlantImageModal.tsx:105), [discard](D:/Projekty/Python/Flovers/mobile/src/features/plant-details/components/modals/ChangePlantImageModal.tsx:287), [active backdrop](D:/Projekty/Python/Flovers/mobile/src/features/plant-details/components/modals/ChangePlantImageModal.tsx:309), [cleanup](D:/Projekty/Python/Flovers/mobile/src/shared/utils/photoStorage.ts:74).

    Fix: serialize photo mutations per plant across modal sessions and prevent cleanup from deleting another operation's committed version. Closing/discarding must account for an already-running save.

11. **S3-11: Logout does not persist intent until push cleanup finishes.**

    Logout first awaits push deregistration while retaining credentials in storage and authentication in the UI. Force-closing during that wait leaves no durable logout indication. A source-based React provider probe restarted the provider during pending cleanup and restored the original account from storage.

    Source: [logout ordering](D:/Projekty/Python/Flovers/mobile/src/app/providers/AuthContext.tsx:42). This requires interruption before logout finishes; the probe did not rely on an unsupported streaming-response behavior.

    Fix: commit local signed-out intent promptly, cancel account/session work, and retain only an ephemeral credential snapshot for bounded push cleanup. Bootstrap must not restore an account after a recorded logout request.

12. **S3-12: Spreadsheet exports treat accepted text as workbook syntax.**

    A completion note containing an XML-invalid control character is accepted by the serializer but raises `openpyxl.IllegalCharacterError` during export. Workbook construction happens before the email error handler, so the export fails. Separately, plant names beginning `=1+1` and notes beginning `=SUM(1,2)` were written as formula cells rather than literal text. Readings exports behave similarly.

    Source: [accepted note](D:/Projekty/Python/Flovers/backend/reminders/serializers.py:49), [task workbook](D:/Projekty/Python/Flovers/backend/reminders/views.py:179), [readings workbook](D:/Projekty/Python/Flovers/backend/readings/views.py:233).

    Exports are sent to the requesting user's email. Cross-user formula exploitation or successful data exfiltration was not demonstrated. The confirmed impacts are failed exports and changed interpretation of user text.

    Fix: reject/normalize invalid XML controls and write untrusted text as literal string cells. Handle workbook generation failures explicitly.

The following deployment-dependent risks require checking configuration before assigning production impact:

- **D1: Local Docker builds can include credentials.** [Dockerfile](D:/Projekty/Python/Flovers/backend/Dockerfile:18) copies the build context, while [.dockerignore](D:/Projekty/Python/Flovers/backend/.dockerignore:1) does not exclude `.env` or `secrets/`. A build from a working directory containing those files can embed them in the image. Git ignores do not filter a Docker context. The checked-in CI uses a fresh Git checkout, so this does not establish that its published image contains credentials. No secret files or existing image layers were inspected. Exclude secret material from the context and supply runtime secrets separately.
- **D2: Public-contact throttling depends on trusted proxy handling.** [Public contact](D:/Projekty/Python/Flovers/backend/profiles/views_support.py:38) uses a five-per-hour scoped throttle, without an explicit DRF proxy-count policy. In the installed DRF implementation, the default identity incorporates `X-Forwarded-For`. Keeping `REMOTE_ADDR` fixed while changing that header allowed seven requests and fourteen mocked outbound emails; a fixed header allowed five requests, then two 429s. Exploitability requires direct backend access or a proxy that preserves/appends untrusted incoming forwarded headers. The production proxy configuration is outside this checkout. Configure trusted identity extraction, restrict direct backend access, and strengthen public recipient-abuse controls.
- **D3: Missing secret configuration does not stop startup.** [Django secret](D:/Projekty/Python/Flovers/backend/app/settings.py:17) and [JWT signing key](D:/Projekty/Python/Flovers/backend/app/settings.py:114) have public development defaults even when debug defaults to false. A deployment missing either variable can silently use a known key. Password-bound JWT revocation remains enabled; arbitrary-account takeover from the key alone was not demonstrated. Fail startup outside explicit development mode when required secret configuration is absent. Actual environment values were not read.

One candidate was kept out of the confirmed count: [PlantsScreen edit loading](D:/Projekty/Python/Flovers/mobile/src/features/plants/pages/PlantsScreen.tsx:323) has no request-generation guard. An extracted-handler probe allowed A's late response to fill B's editor and submit A's fields to B. However, the [loading overlay](D:/Projekty/Python/Flovers/mobile/src/features/plants/pages/PlantsScreen.tsx:921) blocks ordinary consecutive row taps. A complete supported navigation/UI trigger remains unverified, so the handler result alone is insufficient to claim ordinary wrong-plant overwrites.

Validation used isolated fixtures, not production services:

- **14 backend diagnostic tests passed**: seven IoT/device proofs and seven reminder/account/scheduler proofs. Their assertions confirm the defective current behavior; passing does not mean these defects are fixed.
- **Three mobile diagnostic probes passed**: ambiguous create response, overlapping photo replacement, and the lower-confidence editor candidate.
- Two additional source-based probe scripts checked interrupted logout, export text handling, forwarded-header throttling, and account handoff escaping. Query markup stayed encoded in the activation/reset handoff; that check did not establish a script-injection defect.
- The automatic watering proof compiled and executed the current generated C++ helper against simulated I/O. Backend proofs used in-memory SQLite; SMTP/FCM/network/storage effects were mocked as appropriate.
- Source hashes for **2,244 repository files** were unchanged before adding this report. No application fixes, project database writes/migrations, deployments, emails, push sends, firmware uploads, or real-device operations were performed. Production PostgreSQL concurrency, reverse proxy behavior, native timing, and physical watering remain untested.

Executable proof artifacts and logs are retained under [the isolated audit directory](C:/Users/pudel/AppData/Local/Temp/flovers-flow-audit-80b29ff309af415fbc964ff7c15d9c94): `test_stage3_iot_proofs.py`, `backend_stage3_iot_complete.log`, `stage3_backend_integrity/test_integrity_probes.py`, `stage3_backend_integrity/proof.jsonl`, `stage3_mobile/mobile-outcomes.test.js`, `stage3_mobile/results.json`, and `stage3_web/`.

Recommended implementation order: verified TLS and reboot-safe watering, authenticated device rate limits with sufficient acknowledgement capacity, durable notification delivery, ingestion integrity and stale-write protection, then the remaining account/client/history/export fixes. Check D1-D3 against deployment configuration alongside that work.
