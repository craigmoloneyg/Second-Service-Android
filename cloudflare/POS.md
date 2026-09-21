# Shared orders and kitchen display

Recovered reference: Garnish-1.3.2-POS-Kitchen-RECOVERED.apk, SHA256
67d8fa0a80d9a951920daa2f6ee3d29516cb8be9858cca907a6ed59de046fcb1.
The appended welcome.js contained local menu/orders/KDS using garnish.pos.v1.
The shared replacement preserves its order fields and preparation workflow,
but uses account-scoped D1 persistence, integer cents and explicit payment limits.

Current orders in the owner workspace provides menu entry, Send to kitchen,
new/cooking/ready/collected states, cancel/recall, recovered JSON import and backups.
No payment processing, tax receipt, accounting posting or external POS ingestion.
The Square connection continues to serve sales reporting only. A POS/KDS pilot
must validate Square open-ticket availability for this merchant before integration.

Kitchen pairing links hold 256-bit one-time tokens in URL fragments, expire after
15 minutes, and are stored only as hashes. Explicit redemption issues a hashed
30-day kitchen session and clears owner cookies in that browser. The worker blocks
other API routes when a kitchen cookie is present, even if expired or revoked.
Kitchen responses omit products, prices and completed history. Owner can revoke.
Staff clock-only sessions cannot call POS routes. No password is shared.

Polling every 5 seconds while visible; keep the device awake and online. No
background push/offline queue. Last success age remains visible and changes after
15 seconds; do not infer an empty board means there are no orders while offline.
Mutations use revision CAS, order versions and request IDs. Storage limits: 1000
products, 5000 orders, 2 MB per owner; reaches an explicit error, never truncates.

Import is explicit, empty-destination-only and preserves original local storage.
Use Export recovered data on this device on the original phone, then import JSON.
Old paid labels are recorded as legacy_unverified. Do not uninstall the recovered
APK until its local export has been saved and verified. The shared UI's root ID
suppresses the old recovered addon when the server script executes first; the
normal 1.3.2 wrappers contain no recovered addon. This is a server update, not a
new APK. Actual Android/iPad installation and a real venue service remain untested.
