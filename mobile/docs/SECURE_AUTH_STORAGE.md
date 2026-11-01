# Secure authentication storage

Access and refresh tokens and the cached account identity live in one versioned
`react-native-keychain` record under service `com.flovers.mobile.auth.v1`.
The exact dependency version is pinned in package.json and package-lock.json.
Login passwords are not persisted. Normal HTTP requests continue to use the
in-memory access token; native storage is used for boot, login, refresh, cached
identity changes and logout.

## Platform configuration

- Android: AES-GCM encryption using `AES_GCM_NO_AUTH`, with at least
  `SECURE_SOFTWARE` security (encryption keys stored in Android Keystore).
  Hardware-backed protection is used where provided by the device. Ordinary
  app use does not require a fingerprint/face prompt. Android backup is already
  disabled in the app manifest.
- iOS: `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, with `cloudSync: false`.
  Credentials are device-bound and remain available for background use after
  the first unlock following a restart. No Keychain access group is shared with
  another app, and no biometric access-control gate is requested.

The native package autolinks on both platforms. For iOS, install CocoaPods on
macOS after installing the npm dependencies, then build with Xcode. An iOS build
cannot be verified from the Windows development environment.

## Upgrade and reinstall behavior

On an installation without a secure-storage marker, bootstrap reads the old
`auth_access_token`, `auth_refresh_token` and `auth_user` keys. It writes the complete
session to secure storage, reads it back to verify the write, marks the session
active and removes all three legacy keys before exposing the restored session.
A native write or verification failure never falls back to a plaintext session;
the legacy copy is retained for a later migration retry. A failed plaintext cleanup
also prevents restoration until that cleanup succeeds.

After migration, an absent, malformed or unreadable secure record does not trigger
legacy-token fallback. Existing secure data takes precedence over stale legacy
copies. iOS Keychain items may survive uninstall; without this installation's
marker or a migratable legacy session, bootstrap clears the leftover secure item
instead of signing a fresh installation into the old account.

AsyncStorage contains only the non-secret `auth_secure_state_v1` lifecycle marker
for this subsystem. There are no new token or cached-account writes there.

## Failure and race handling

All authentication storage operations share a serialized queue and generation
checks. Tokens are saved as one record so refresh cannot pair credentials from
different accounts. Login does not publish an authenticated session until secure
persistence succeeds; logout or a newer login invalidates a pending login.

Before replacing a session, storage records a non-secret signed-out tombstone.
Logout writes the same tombstone before attempting native deletion and legacy
cleanup. The tombstone prevents a failed native delete from restoring the old
session on the next boot. Both cleanup operations are awaited even if one fails,
so a later login cannot race late cleanup. Storage failures are propagated using
a generic error without credential values; no plaintext fallback exists.

A process interruption or storage failure can require signing in again. Secure
storage protects persisted credentials; access tokens must still be available in
application memory while sending authenticated API requests.

## Verification

Regression tests cover migration and its failure points, plaintext cleanup,
atomic refresh/profile updates, device-only options, missing/corrupt records,
iOS reinstall behavior, logout cleanup failures, interrupted replacements and
login/logout/refresh races. The shared auth-provider tests also verify that
storage failures cannot expose an authenticated screen.

Reference: [react-native-keychain](https://github.com/oblador/react-native-keychain)
and its [storage configuration documentation](https://oblador.github.io/react-native-keychain/docs/faq/).
