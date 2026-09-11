# Second Service Android

Android WebView container for the existing Second Service Profit Intelligence app:
https://second-service-profit-intelligence.craig-moloneyg.workers.dev/

The live app remains the UI and backend. No website code or business data is copied into the APK. Website updates appear in the app without rebuilding. The launcher uses a navy and gold SS monogram because the website manifest does not supply an icon.

## Install

Open this repository's Actions tab, select the latest successful **Build Android APK** run, and download **Second-Service-debug-APK** under Artifacts. Sign in to GitHub if prompted. Extract the ZIP, transfer `Second-Service-debug.apk` to an Android 10 or later device, and open it. Allow installation from that source when Android prompts. This is a debug APK for direct installation, not a Play Store release. Separate CI runs may use different debug signing keys, requiring uninstall before installing another build; uninstalling clears local session data.

## Build

Use JDK 17 and Android SDK platform 35 / build tools 35.0.0. Set `ANDROID_HOME` or set `sdk.dir` in an untracked `local.properties` file.

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug
```

On Windows use `gradlew.bat`. Output: `app/build/outputs/apk/debug/app-debug.apk`.
The checked-in Gradle wrapper pins Gradle 8.11.1. Pushes, pull requests and manual workflow runs build and upload the APK with a SHA-256 checksum.

## Features and boundaries

- Same live responsive navy-and-gold UI, JavaScript, local storage and persistent first-party cookies.
- Invoice upload using the Android document picker; no broad storage or camera permission.
- Android Back navigates web history; page state is restored after activity recreation.
- Loading indicator, network/server error message and retry.
- Same-origin HTTPS stays in the app; external web, phone and email links use other apps.
- Same-origin HTTP(S) file responses download into Downloads with session cookies. JavaScript-generated blob/data downloads and direct camera capture are not implemented; the inspected invoice workflow uses the document picker.
- No native JavaScript bridge, cleartext traffic, file URL access, or SSL-error bypass.
- Requires internet and a working live backend. Existing demo data, placeholder website controls, and mobile website layout remain as provided by the site.

## Device smoke test

Install on a device and verify loading, invoice PDF/image selection and extraction, ingredient/recipe views, Back navigation, rotation, external links, and offline/retry behavior. Do not create or delete real business records just to test the wrapper. Unit tests exercise origin filtering; CI runs Android lint and compiles the APK. Successful CI is not a substitute for this device test.
