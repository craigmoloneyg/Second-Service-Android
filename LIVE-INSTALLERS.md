# Garnish 1.4.1 app-window repair

Windows now uses a sandboxed Electron application window with persistent app cookies, Garnish icon, workspace navigation, reload and fullscreen controls. Android uses its own WebView with persistent cookies, file picking, downloads and an error/retry screen. Neither launches the system browser for the workspace.

Known sign-in and callback destinations remain inside the app. Navigation unit tests verify routing; live ChatGPT authentication and Google/Apple identity-provider acceptance have NOT been verified on physical devices. Some identity providers may reject embedded browsers. Do not claim that a successful build proves successful login.

Both connect to the repaired live Garnish service. Internet is required for synchronized orders; this is not an offline POS engine. No existing local records are removed.

The Windows installer uses the existing live-installer app ID; Android uses com.garnish.app to avoid overwriting earlier differently signed APKs. Android is development-signed and Windows is unsigned. Keep previous apps until data access and sign-in are confirmed.

The packaged icon is the sliced-circle mark extracted from Craig's supplied Garnish logo. ICO sizes 16–256 are embedded in Windows installer/executable and the PNG is packaged for Android.
