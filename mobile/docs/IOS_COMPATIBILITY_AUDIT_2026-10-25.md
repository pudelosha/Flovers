**Flovers iOS compatibility audit — 25 October 2026**

Reviewed local commit `2936361ef0baa24105e5a2fcd873513ec22546b9`. Read-only review: no repository changes, dependencies, deployments, or device actions. The application is not ready for an iOS release. Shared JavaScript can be bundled for iOS, but native startup and integration have blockers.

**Checks performed and limits**

- Reviewed the native iOS project, installed library implementations, app startup, navigation, sensor bridges, all wizard steps, local photo storage, recognition requests, QR scanner permissions, notification setup, and form layouts.
- Metro production bundle for `--platform ios` succeeded and copied 30 assets. This resolves/transforms JavaScript; it does not execute startup or compile CocoaPods/Swift.
- Six existing suites passed, 22 tests total, with `Platform.OS` explicitly set to `ios`: wizard state/creation recovery/reset, interval tuning, photo storage, and recognition service. Their native mocks do not validate sensor imports, real permissions, camera access or APNs.
- Both Android-specific sensor wrappers were reproduced throwing using the actual installed React Native emitter implementation under iOS. The magnetometer unavailable path was separately reproduced as an unhandled asynchronous error.
- Info.plist and PrivacyInfo XML are valid. Git working tree remained clean.
- No Xcode/iOS Simulator/iPhone execution was available on the Windows host. Native compilation, signing, UI layouts and hardware behavior remain unverified.

**Prioritized findings**

1. **P1 — Sensor wrappers can prevent the entire app from starting on iOS. Confirmed JavaScript reproduction.**
   `mobile/src/native/LightSensorModule.ts:18` and `mobile/src/native/HeadingModule.ts:17` construct `new NativeEventEmitter()` with no module. React Native 0.81.4 explicitly throws on iOS for this call (`node_modules/react-native/Libraries/EventEmitter/NativeEventEmitter.js:65`). Eager imports lead from App → RootNavigator → AppTabs → CreatePlantWizardScreen → MeasureExposureModal → Sensors → both wrappers. Android guards inside sensor methods execute too late. Reproduced error: `Invariant Violation: new NativeEventEmitter() requires a non-null argument.` Instantiate platform-appropriate emitters only when supported, or expose safe no-op iOS bridges; preserve the Android event source and cleanup contract.

2. **P1 — Firebase default application is not configured for iOS. High confidence from source and installed library.**
   `mobile/ios/mobile/AppDelegate.swift:13` does not initialize Firebase; the iOS project contains no GoogleService-Info.plist or corresponding resource entry. `mobile/index.js:18` calls `messaging()` before app registration, and installed RNFirebase throws if its native default app is missing. Add the matching Firebase iOS application configuration and initialize it before React Native starts. External Firebase/Apple account configuration was not inspected. [Installed-version setup instructions](https://raw.githubusercontent.com/invertase/react-native-firebase/v23.8.6/docs/index.md).

3. **P1 — CocoaPods integration does not provide the installed Firebase version's documented defaults. Native build unverified.**
   `mobile/ios/Podfile:11` enables frameworks only if USE_FRAMEWORKS is supplied externally, and does not set RNFirebaseAsStaticFramework. Installed RNFirebase 23.8.6 documents static framework integration. Make the Podfile and setup instructions consistent with this version, then run pod install and an Xcode build. Do not assume the newest website instructions apply unchanged to these installed dependencies. [Versioned framework instructions](https://raw.githubusercontent.com/invertase/react-native-firebase/v23.8.6/docs/index.md).

4. **P2 — Unavailable compass produces an unhandled asynchronous error. Confirmed JavaScript reproduction.**
   `mobile/src/features/create-plant/services/Sensors.ts:27` subscribes to the magnetometer with only a next callback. The installed library checks availability asynchronously and calls observer.error when unavailable. The surrounding try/catch cannot catch it. This is especially relevant to the iOS Simulator and devices without magnetometers. Add an error observer, expose unavailable/error state, and retain manual direction selection. [Apple heading availability](https://developer.apple.com/documentation/corelocation/getting-heading-and-course-information).

5. **P2 — iOS compass readings are less reliable than the Android implementation. Algorithm gap; physical error magnitude unverified.**
   `mobile/src/features/create-plant/services/Sensors.ts:22` uses raw magnetometer x/y with atan2. It lacks tilt compensation, calibration and accuracy validation. Android uses its custom fused heading module. Wizard results can therefore save an incorrect window direction and affect care interval tuning. Prefer a supported native heading implementation with availability/accuracy handling, or properly calibrated device motion. [Apple raw magnetic field documentation](https://developer.apple.com/documentation/coremotion/cmmagnetometerdata/magneticfield).

6. **P2 — iOS push setup is incomplete. Confirmed repository configuration gaps.**
   The Xcode project has no entitlements file/CODE_SIGN_ENTITLEMENTS/aps-environment. Info.plist lacks background remote notification configuration. Enable Push Notifications and any background mode required by the intended delivery behavior, use matching provisioning, and check the APNs key in Firebase. Background mode is not required merely to display every alert, but is needed for the background-message behavior this code is intended to support. [Installed-version messaging setup](https://raw.githubusercontent.com/invertase/react-native-firebase/v23.8.6/docs/messaging/usage/ios-setup.md).

7. **P2 — Icon fonts are not registered on iOS. High confidence.**
   `mobile/ios/mobile/Info.plist` has no UIAppFonts, and app code never calls loadFont. The installed vector-icons pod copies font files but requires registration. MaterialCommunityIcons is used throughout navigation and the wizard. Register the required font rather than assuming Android's font setup carries over. [Vector-icons 10.x iOS instructions](https://github.com/oblador/react-native-vector-icons/blob/10.x/README.md#ios-setup).

8. **P2 — QR scanner's permission recovery button is disconnected. Confirmed API mismatch; affects Android too.**
   `mobile/src/features/scanner/pages/ScannerScreen.tsx:94` destructures openSettings from useCameraPermission, but the installed Vision Camera hook only exposes hasPermission and requestPermission. The button at line 358 receives an undefined onPress. Use React Native Linking.openSettings and test denial followed by re-enabling camera access.

9. **P2 — Notification opening has a startup ordering risk. Conditional, not reproduced on an iPhone.**
   `mobile/src/api/services/push.service.ts:136` awaits token lookup/backend registration before subscribing to Notifee foreground PRESS events at line 154. Notifee's iOS app-open path uses those events; the RNFirebase initial/opened callbacks do not cover the same path with Notifee >=7. Register interaction listeners before async setup and queue navigation until ready. Verify cold starts, background opens, expired login, and slow/offline registration. [Notifee app-open events](https://notifee.app/react-native/docs/events/), [release notes](https://notifee.app/react-native/docs/release-notes/).

10. **P2 — Keyboard overlap needs physical/simulator verification. Layout risk, not a demonstrated device failure.**
    Wizard ScrollView and several profile/contact/watering overlays lack iOS keyboard avoidance/inset handling. The watering duration field uses number-pad (`WateringScheduleModal.tsx:292`), with no Done/dismiss affordance and the action below the input. Check small iPhones and large text; ensure inputs, validation messages and actions remain reachable. [React Native keyboard inset behavior](https://reactnative.dev/docs/scrollview#automaticallyadjustkeyboardinsets).

11. **Release readiness — Native identity/assets/testing remain template configuration.**
    `mobile/ios/mobile.xcodeproj/project.pbxproj:301` uses a template bundle identifier, and no team/provisioning workflow is documented. Info.plist display name and launch screen say mobile. AppIcon catalog entries have no filenames and no icon image files exist. The shared scheme references a mobileTests target absent from the project. There is no iOS CI build or Podfile.lock. Configure the real iOS identity, app assets and build/test workflow before TestFlight. Retaining an unsigned simulator build job would catch integration failures without requiring production signing secrets.

**Wizard sensor capability plan**

| Feature | Present behavior | iOS approach |
| --- | --- | --- |
| Ambient light / lux | Android custom module; Sensors.startLight deliberately returns null on iOS | Keep manual light selection. State clearly that light measurement is unavailable; do not show a timed light test as if it can succeed. |
| Compass / window direction | Android fused heading; iOS raw magnetometer fallback | Implement a reliable iOS heading provider with error/accuracy states; manual N/E/S/W remains available. |
| Room/location | Saved application location, not GPS | No GPS permission is required for this wizard flow. |
| Camera/gallery photo | Image-picker supports iOS; purpose strings are present | Test camera denial, limited library, iCloud photos, rotation and large images on iPhone. No confirmed source-level blocker was found here. |
| Purchase date | iOS inline picker and explicit Done control exist | Verify layout/date locale on iPhone; no missing close action found. |
| Creation/local photo save | Shared API logic and sandbox-based RNFS storage | Existing mocked tests pass; validate real filesystem access and retry behavior on device. |

iPhones have an ambient light sensor, but this app cannot obtain ordinary lux readings through its Android bridge. Apple's SensorKit ambient-light entitlement is restricted to approved research use; adding a plist permission is not a general solution. Manual input is the practical default for Flovers. [Apple SensorKit project setup](https://developer.apple.com/documentation/sensorkit/configuring-your-project-for-sensor-reading), [reader entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.sensorkit.reader.allow).

No evidence was found that the current raw magnetometer code requires adding GPS permissions, or that the missing motion-activity purpose string alone proves a crash. Those requirements must follow the actual APIs chosen for any replacement, rather than being added speculatively.

**Recommended implementation and validation order**

1. Fix eager sensor imports and Firebase startup; complete the version-appropriate Podfile integration.
2. Make iOS light explicitly manual; replace/guard compass handling and preserve manual wizard completion.
3. Register fonts, finish notification capabilities/interaction handling, and repair scanner settings recovery.
4. Complete iOS app identity/assets and obtain a simulator build on macOS.
5. On a physical iPhone, test registration/login/logout, every wizard step, compass accuracy at different tilts, camera/library permission denial and recovery, QR scan/save, local photo persistence, reminders/readings/manual watering, notification opens in all app states, deep links and keyboard access. Sensor tests cannot be signed off using Simulator alone.
