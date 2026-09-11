# Price 2 Plate for Windows

This desktop wrapper opens the live Price 2 Plate service in an installable Windows app. It requires an internet connection and keeps the live website as the source of the UI and data.

From this folder, `npm install` followed by `npm run dist` creates `dist/Price-2-Plate-Setup-1.0.0.exe`. The GitHub Actions workflow builds the installer on Windows and uploads it as **Price-2-Plate-Windows**.

The wrapper restricts in-app navigation to the HTTPS service origin, sends other supported links to the default Windows app, denies site permission requests, and keeps Electron Node APIs isolated from the remote page.
