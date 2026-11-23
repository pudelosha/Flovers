# Mobile BLE pairing (Phase 4)

Implemented locally on top of the Phase 2 control plane and Phase 3 universal
firmware. This does not deploy the backend, enroll/flash boards, or prove physical
Android/iOS interoperability. Existing DIY firmware and its account-secret workflow
remain available. No GPIO, pump duration, cooldown or offline-watering policy changes.

## User flow

1. Create a logical device in Readings and associate it with an owned plant.
2. Open Device Setup → Pair device. This opens the existing Scanner in device-only
   mode. Its regular mode still recognizes plant QRs and also accepts device QRs.
3. Scan the factory JSON QR. Choose an owned logical device if scanning normally.
4. Power on the board to open its five-minute BLE window. Enter a 2.4 GHz SSID and
   password (empty only for an open network). No phone Wi-Fi password discovery.
5. The app authenticates the BLE channel with Security 1 and the factory PoP,
   checks the hardware identity, requests an owner-authenticated backend session,
   and sends the session proof and Wi-Fi through `flovers-config`.
6. Success requires backend session `confirmed`, the matching hardware ID, recent
   authenticated contact, and the exact desired configuration version applied.
   BLE connection, Wi-Fi connection and command acceptance are insufficient.

Device Setup polls real owner-only identity/configuration evidence. Save & sync
updates desired settings through the existing API; the board polls and acknowledges
them. Saving an offline device leaves synchronization pending, without re-pairing.
Legacy/unreported pairing is never inferred from a last-reading timestamp.

## Wi-Fi, replacement and interruptions

Change Wi-Fi authenticates the same factory QR and sends `action=wifi`. It never
starts a new binding or revokes a token. Completion additionally requires the board's
`in_progress=false`, a successful outcome for the exact accepted `operation_id`, and
a fresh backend configuration-sync time. The status reply has `operation_state`
separate from background synchronization: restoring the old Wi-Fi after a failure
cannot be mistaken for successful application of the newly submitted network.

Replacement requires explicit confirmation and the existing bound hardware ID read
from the server. Only successful factory proof replaces the board; readings and
cooldown history remain, and backend pairing keeps automatic watering off.

Cancellation, backgrounding, navigation and logout disconnect BLE and invalidate
the pending claim where possible. A claim already bound cannot be silently undone.
A queued board operation may continue after closing the app. The UI says to inspect
Device Setup before retrying. Revoke board access has a separate explicit confirmation;
it preserves the logical device/readings and allows recovery if credential storage
was interrupted. This is not a factory reset and never clears pump safety history.

The operation has a 150-second deadline. API calls have a 15-second timeout. Stalled
native operations cannot overlap a new transport while cancellation is settling.
Session-creation limits remain 30/hour; polling/cancellation have a separate 120/minute
owner budget so the wizard does not exhaust its own creation limit.

## Native dependencies and security

- RN bridge: `@orbital-systems/react-native-esp-idf-provisioning` **0.7.1**, npm lockfile.
- Android official SDK: **lib-2.4.4**, as pinned by the bridge.
- iOS official SDK: **ESPProvision 3.2.0**, explicitly pinned in Podfile.
- Use **BLE + Security 1 + PoP** only. No SoftAP or stock `provision()` call.
- Reject security-version mismatch and `no_pop`, including SDK metadata negotiation.
- Strict QR schema/name/identity/length checks. Reject embedded backend credentials.
- PoP, SSID/password and session claim live only in memory. No QR secrets in navigation
  parameters, AsyncStorage, clipboard, toasts, raw scanner overlays or error messages.
- Android SDK logs PoP in `initSession`. The narrowly scoped AGP ASM visitor removes
  `android.util.Log` writes only from `com.espressif.provisioning.*` in **all variants**,
  including debug. Crypto, error callbacks and application logging are preserved.
  This avoids changing global release minification. Official iOS SDK logging is off
  by default; do not enable SDK diagnostic logging with real factory secrets.
- Android 31+: runtime scan/connect permissions, `neverForLocation`. Older Android:
  foreground location required for BLE. iOS: Bluetooth usage description and system
  consent. No background BLE/location or local-network/SoftAP entitlement added.
- Shared users are excluded in the UI and rejected independently by backend ownership.
- Missing Phase 2 API or older status protocol produces an update-required error;
  it never falls back to sharing an account-wide secret over BLE.

## Verification and limits

Run mobile TypeScript, ESLint and Jest. The pairing tests cover QR rejection, owner
selection, permissions, authenticated transport, downgrade protection, exact applied
version, replacement consent, Wi-Fi identity preservation, cancellation races, expiry,
timeout and stale completion. Native logging visitor tests:

```sh
cd mobile/android
./gradlew -p buildSrc test
```

Build the real Android application as well as both universal ESP32-C3 firmware
variants. Do not substitute mocked BLE tests for physical verification. Windows
cannot compile the iOS target: run `bundle exec pod install` on macOS, review the
resolved Podfile.lock, then build and test iOS with a real board before rollout.

Physical Phase 5 checks still required: correct/wrong PoP, Bluetooth disabled, actual
Android/iOS discovery, permission denial/regrant, bad Wi-Fi, app termination, Wi-Fi
change, interrupted token persistence, replacement/revocation, cold boot, sensor reads
and pump safety. No OTA or autonomous offline watering is introduced.

The Phase 2 migration remains pending in production. LIGHT deployment must refuse it;
the APK alone cannot enable pairing against a backend without these endpoints.

## Phase 5 release acceptance

Automated evidence runs in the existing mandatory CI matrix, not against production:

| Check | Evidence |
| --- | --- |
| Pairing wire compatibility | Seventeen additional provider-verified scenarios; actual Django JWT/DRF/Ed25519 binding and acknowledgement, then replay through the current adapters and pairing controller. |
| Previous DIY/mobile compatibility | Existing pinned previous-client contracts, account-secret tests, and both unchanged generated DIY variants. |
| Readings/pump lifecycle | Real device-token HTTP/DB round trips at 1/20/300 seconds; zero/null metrics, retries, new HTTP client, idempotent completion, persistent cooldown and settings-version gating. No relay is actuated. |
| Ownership/concurrency | Owner versus recipient/anonymous contracts and real PostgreSQL competing-claim test in CI. |
| Interrupted setup/storage | Cancelled/expired/bound session tests; late-response cancellation, native connection cancellation and firmware NVS failure/receipt harnesses. |
| Native application | Real Android APK compilation and existing disposable-backend Maestro journeys. These flows do not simulate physical BLE success. |
| Deployment rehearsal | Existing exact-image staging migration/media rehearsal; no production migrations or automatic publication. |

Physical BLE discovery, wrong-PoP negotiation on hardware, Wi-Fi changes on a real
board, power interruption during flash/NVS writes, sensor accuracy, actual relay
timing and iOS build/device behavior remain mandatory physical acceptance checks.
Passing software simulation cannot turn these into hardware passes.

The new schema is migration `readings.0011_physical_device_foundations`. An approved
LIGHT release must refuse it when pending. Keep production deployment blocked until
the owner approves a migration-capable release with its real prerequisites. Do not
remove the migration gate, fabricate recovery evidence, or interpret an APK install
as approval to flash a board or run production migrations.
