# Price 2 Plate Android

Price 2 Plate is the Android app for the existing restaurant profit intelligence service:
https://second-service-profit-intelligence.craig-moloneyg.workers.dev/

The live app remains the UI and backend. The Android app adds a small, origin-restricted UI enhancement for batch invoice uploads and the Price 2 Plate name. Website updates appear without rebuilding; the enhancement depends on the existing invoice form IDs and extraction API and must be reviewed if those change. The launcher uses a navy and gold plate-and-chart icon with no initials. The original repository, package ID, and backend URL remain stable for app continuity. The standalone website has not been renamed or changed by this project.

## Install

Open this repository's Actions tab, select the latest successful **Build Android APK** run, and download **Price-2-Plate-debug-APK** under Artifacts. Sign in to GitHub if prompted. Extract the ZIP, transfer `Price-2-Plate-debug.apk` to an Android 10 or later device, and open it. Allow installation from that source when Android prompts. This is a debug APK for direct installation, not a Play Store release. Separate CI runs may use different debug signing keys, requiring uninstall before installing another build; uninstalling clears local session data.

## Build

Use JDK 17 and Android SDK platform 35 / build tools 35.0.0. Set `ANDROID_HOME` or set `sdk.dir` in an untracked `local.properties` file.

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug
npm ci
npm test
```

On Windows use `gradlew.bat`. Output: `app/build/outputs/apk/debug/app-debug.apk`.
The checked-in Gradle wrapper pins Gradle 8.11.1. Pushes, pull requests and manual workflow runs build and upload the APK with a SHA-256 checksum.

## Features and boundaries

- Cream-and-green welcome page and dashboard styling, with direct navigation to invoices, menu costing and the dashboard. The live business data, JavaScript, local storage and first-party cookies remain in use.
- Both Android and Windows load the same welcome-page and batch-upload enhancements. This changes the installed apps; the standalone website is not redeployed.
- Select 1–50 PDF, PNG, JPEG, or WebP invoices using the Android document picker; no broad storage or camera permission. Selections above 50 are rejected, never silently truncated.
- A sequential upload queue uses the existing extraction endpoint, shows per-file results and progress, and continues after individual failures. Stop finishes the current request and leaves remaining files unsent. Failed or uncertain results are never automatically retried; check purchasing history before resubmitting to avoid duplicates.
- Keep the batch screen open. Rotation preserves the running WebView, and Back/page links are blocked while the batch runs. Force closing the app or OS process termination does not resume a batch automatically.
- Android Back navigates web history; page state is restored after activity recreation.
- Loading indicator, network/server error message and retry.
- Same-origin HTTPS stays in the app; external web, phone and email links use other apps.
- Same-origin HTTP(S) file responses download into Downloads with session cookies. JavaScript-generated blob/data downloads and direct camera capture are not implemented; the inspected invoice workflow uses the document picker.
- No native JavaScript bridge, cleartext traffic, file URL access, or SSL-error bypass.
- Requires internet and a working live backend. Existing demo data, placeholder website controls, and mobile website layout remain as provided by the site.

## Device smoke test

Install on a device and verify loading, selection of multiple invoice PDFs/images, extraction, the 50-file limit, ingredient/recipe views, Back navigation, rotation, external links, and offline/retry behavior. Do not create or delete real business records just to test the wrapper. Unit tests exercise origin filtering; browser DOM tests cover 50-file batching, limit rejection, failures, stopping, safe result rendering and repeat-click prevention with simulated responses. CI runs these tests, Android lint and APK compilation. Successful CI is not a substitute for this device test.
