# Garnish Live 1.4.0

Android and Windows launchers open https://garnish-craig.craig-moloneyg.chatgpt.site/workspace in the system browser, retaining browser sign-in and receiving live site updates.

These are online launchers, not offline POS engines. The Android package is a development-signed APK built by the existing CI workflow; Windows is an unsigned installer. Physical-device installation has not been tested.

They use new application identities and the name Garnish Live, so existing Garnish installations and local data are preserved. Use the same Garnish account on order-entry and kitchen devices to share venue records. The hosted site determines feature availability.

The old injected welcome and invoice scripts are not executed by these launchers. No changes are made to the legacy Cloudflare service.
