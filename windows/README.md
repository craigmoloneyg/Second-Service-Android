# Price 2 Plate for Windows

This desktop wrapper opens the live service with the Price 2 Plate cream-and-green welcome page, dashboard theme and 50-invoice batch upload. The UI enhancements are shared with Android and bundled at build time. It requires an internet connection and keeps the existing service as the source of business data.

From this folder, `npm install` followed by `npm run dist` creates `dist/Price-2-Plate-Setup-1.1.0.exe`. The GitHub Actions workflow builds the installer on Windows and uploads it as **Price-2-Plate-Windows**.

The wrapper restricts in-app navigation to the HTTPS service origin, sends other supported links to the default Windows app, denies site permission requests, and keeps Electron Node APIs isolated from the remote page.
