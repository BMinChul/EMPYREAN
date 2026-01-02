# Status

## Active Work
- **Completed**: Implemented "Resume Cleanup" in `MainScene.ts` to fix stale bet boxes on tab focus.
- **Completed**: Updated Backend API URL to Replit Server (`https://544fcf9d-fabb-47fe-bc6a-ea9895331f00-00-3s83yvw73cevs.spock.replit.dev`).
- **Completed**: Fixed Expiry Time Calculation (Based on Head position instead of Column 4).
- **Completed**: Implemented Explicit Refund Flag (`isRefund`) for Orphaned Transactions.
- **Completed**: Ghost Bet Fix (Strict check for existing pending container before confirming).
- **Completed**: Text Fade Timing Adjustment (Range [0.45, 0.6] for faster drop-off).
- **Completed**: Refined Ghost Bet Fix (Strict ID matching signature update).
- **Completed**: Implemented Safe Zone logic in `MainScene.ts` (Columns 0-3 are non-interactive).
- **Completed**: State Persistence (Restoring Bets on Reload).
- **Completed**: Anti-Snipping & Exploit Protection (Layout & Deadline Logic).
- **Completed**: Background Execution (Game runs when tab is blurred).
- **Completed**: Orphaned Transaction Refund Trigger (Handle bets expiring during TX mining).

## Recent Activity
- **Feature**: Added `handleGameFocus` event listener in `MainScene.ts`.
  - Automatically cleans up `pendingBoxes` and `bettingBoxes` that have expired while the tab was backgrounded.
  - Checks `expiryTimestamp` against `Date.now()`.
  - Triggers explicit refund check for expired confirmed bets.
- **Update**: Added `expiryTimestamp` tracking to `BettingBox` interface and Phaser Containers.
- **Update**: `MainScene.ts` now properly handles focus events (`this.game.events.on('focus')`).

## Next Steps
- [ ] **Testing**: Verify bet boxes disappear instantly when returning to a tab after 1+ minute.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
