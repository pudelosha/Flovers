# Flovers mobile

React Native/TypeScript client for Flovers. See the [project README](../README.md)
for product features, environment configuration and the full development stack.

## Local development

Use Node.js 24 (as in CI), npm, and the Android or iOS native toolchain. From `mobile/`:

```sh
npm ci
npm start
```

In a second terminal, also from `mobile/`:

```sh
npm run android
```

Select the intended API environment before building. The checked-in Android mapping
uses `.env.production` for debug and release; see the root README before using a
local backend. Do not put signing keys or provider credentials in Git.

For iOS, use macOS/Xcode and install pods before building:

```sh
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

## Maintainer guides

- [Automated quality checks and local test commands](../.github/QUALITY_CHECKS.md)
- [Native Android and browser smoke tests](../e2e/README.md)
- [Account levels and XP](docs/ACCOUNT_LEVELS.md)
- [Appearance and themes](docs/APPEARANCE.md)
- [Secure authentication storage](docs/SECURE_AUTH_STORAGE.md)
- [Shared modal layout](src/shared/ui/MODALS.md)

## iOS release validation

Hosted native smoke coverage is Android-only. Before an iOS release, build with
Xcode and verify signing/app identity, Firebase/APNs setup, secure storage, camera
and photo-library permissions, deep links, notification opens, keyboard access and
small-screen/large-text layouts on an iPhone. Sensor availability and compass errors
need real-device checks; ambient-light measurement must retain manual input where
unsupported. A dated source audit or mocked unit test is not native release evidence.

## Publication

Changes go through a PR and the mandatory CI checks before merging to `main`.
Merging does not publish an app. The manual Google Play workflow runs mobile checks,
builds a signed bundle and uploads a draft internal-test release; publication is
completed in Play Console. Native test APKs are isolated from production services.
