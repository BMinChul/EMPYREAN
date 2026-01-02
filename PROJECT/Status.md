# Status

## Active Work
- **Completed**: Updated Backend API URL to Replit Server (`https://544fcf9d-fabb-47fe-bc6a-ea9895331f00-00-3s83yvw73cevs.spock.replit.dev`).
- **Completed**: Fixed Expiry Time Calculation (Based on Head position instead of Column 4).
- **Completed**: Implemented Explicit Refund Flag (`isRefund`) for Orphaned Transactions.
- **Completed**: Ghost Bet Fix (Strict check for existing pending container before confirming).
- **Completed**: Text Fade Timing Adjustment (Range [0.45, 0.6] for faster drop-off).
- **Completed**: Refined Ghost Bet Fix (Strict ID matching signature update).
- **Completed**: Implemented Safe Zone logic in `MainScene.ts` (Columns 0-3 are non-interactive).
- **Completed**: State Persistence (Restoring Bets on Reload).
- **Completed**: Fixed Expiry Calculation (Deadline based on Column 4 - NOW UPDATED to HEAD).
- **Completed**: Anti-Snipping & Exploit Protection (Layout & Deadline Logic).
- **Completed**: Background Execution (Game runs when tab is blurred).
- **Completed**: Orphaned Transaction Refund Trigger (Handle bets expiring during TX mining).

## Recent Activity
- **Configuration**: Updated API URL in `MainScene.ts`, `gameStore.ts`, and `Requirements.md` to point to the new Replit cloud server.
- **Logic Update**: `MainScene.ts` `placeBet` now calculates `expiryTimestamp` based on the distance to the **HEAD** (Win Position) instead of Column 4. This ensures legitimate wins that occur after Column 4 are not rejected by the server.
- **Store Update**: `gameStore.ts` `claimServerPayout` now accepts an `isRefund` boolean flag.
- **UI Update**: `UIOverlay.tsx` now explicitly calls `claimServerPayout(betId, true)` when detecting an Orphaned Transaction, ensuring the server knows to process a refund.
- **Feature**: Updated `UIOverlay.tsx` `processBet` logic to detect "Orphaned Transactions".
  - If a bet expires (is removed from store) while the transaction is mining, the client now explicitly calls `claimServerPayout(betId)` to trigger the refund/payout process on the server.
  - This fixes the issue where late transactions were silently ignored, causing users to lose funds without a refund check.
- **Bug Fix**: Updated `checkBettingState` in `MainScene.ts` to IGNORE confirmed bets if the corresponding pending box is missing (expired locally). This prevents "Ghost Bets".

## Next Steps
- [ ] **Testing**: Verify "Ghost Bet" fix by confirming a transaction AFTER the box has crossed the deadline.
- [ ] **Testing**: Verify Text Fade ensures text is invisible before Column 4.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
