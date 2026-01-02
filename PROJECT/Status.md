# Status

## Active Work
- **Completed**: Removed `server.js` from repo (Backend now runs locally via ngrok).
- **Completed**: Secure Betting System (Global Lock, Expiration Logic, Snapshot Transmission).

## Recent Activity
- **Architecture**: Switched to Remote Backend architecture (Verse8 -> ngrok -> Local).
- **Client**: Upgraded `MainScene.ts` with strict anti-exploit logic.
- **Backend Sync**: Added `expiryTimestamp` to `/api/place-bet` payload.
- **Config**: Updated all API endpoints to `https://gene-fragmental-addisyn.ngrok-free.dev`.
- **UI**: Pending bets show "PENDING..." (Grey) and expire visually.

## Next Steps
- [ ] **Testing**: Verify the "Late Confirmation" scenario with ngrok latency.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
