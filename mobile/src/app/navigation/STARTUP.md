# Cold-start handoff

The launch artwork covers startup preparation; the signed-in background is not
used as an empty loading screen.

1. `AppStartupProvider` owns a single `LaunchScreen` above the language, auth,
   settings and navigation providers. The same logo image remains mounted while
   those children initialize. Its native placeholder uses the same artwork and
   Android image fading is disabled. `LanguageProvider` can wait without
   replacing or remounting the logo.
2. `SettingsProvider` waits for secure-session restoration before reading or
   writing preferences. A saved appearance is scoped to the account. The old
   unscoped cache is migrated for a restored account without overwriting it with
   guest defaults during authentication.
3. `hydrated` means appearance and language are ready to render. With a cache,
   this becomes true before server settings return. `loading` still tracks the
   server synchronization used by the Profile form; it does not hide navigation.
   Without a cache, settings are fetched before revealing the shell. HTTP
   attempts have an eight-second timeout; failure releases startup using defaults
   without persisting those defaults over saved preferences.
4. `RootNavigator` mounts navigation behind the launch artwork after hydration.
   It waits for navigation readiness, the local background image's load-end
   event (including failure), and the header's title/segment measurements. The
   fallback background colour handles a missing image.
5. The next native frame permanently dismisses the app-root launch artwork and
   enables the existing header animation. Header preparation and animation readiness are separate,
   so the animation cannot finish invisibly behind the logo.
6. After the header settles, `HeaderContentGate` displays its single shared
   spinner while page data is pending. Existing tile animations start when both
   content and header are ready. Already loaded data needs no artificial delay.

Server refreshes and same-account metadata/token updates must not remount the
navigation tree or replay startup. Login uses the regular spinner when account
settings are needed; logout shows Login immediately. Neither operation can
restore the cold-start logo. Auth screen component identities remain stable
while the root rerenders, preserving their fields and entrance animations.
Superseded account responses and older settings-save callbacks cannot change
the current account's appearance. Local
edits made while startup settings refresh take precedence over that response.

Regression coverage: `AppStartup.test.tsx`, `SettingsStartup.test.tsx`, navigation
`Startup.test.tsx`, and `GlassHeader.test.tsx`. Cold-start timing and the final visual handoff also
need physical-device checks in both themes.
