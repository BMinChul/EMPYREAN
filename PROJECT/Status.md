# Status

## Active Work
- **Completed**: Secure Betting System (Global Lock, Expiration Logic, Snapshot Transmission).

## Recent Activity
- **Client**: Upgraded `MainScene.ts` with strict anti-exploit logic (Head passing pending box = Immediate Invalid).
- **Backend Sync**: Added `expiryTimestamp` to `/api/place-bet` payload for server-side validation.
- **Config**: Updated all API endpoints to `https://gene-fragmental-addisyn.ngrok-free.dev`.
- **UI**: Pending bets show "PENDING..." (Grey) and expire visually ("EXPIRED" / Red) if not confirmed in time.

## Next Steps
- [ ] **Testing**: Verify the "Late Confirmation" scenario (ensure red boxes don't turn yellow).
- [ ] **Integration**: Monitor server logs for `expiryTimestamp` validation.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
