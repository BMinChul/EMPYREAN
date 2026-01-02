# Status

## Active Work
- **Completed**: Ghost Bet Fix (Strict check for existing pending container before confirming).
- **Completed**: Text Fade Timing Adjustment (Range [0.45, 0.6] for faster drop-off).
- **Completed**: Refined Ghost Bet Fix (Strict ID matching signature update).
- **Completed**: Implemented Safe Zone logic in `MainScene.ts` (Columns 0-3 are non-interactive).
- **Completed**: State Persistence (Restoring Bets on Reload).
- **Completed**: Fixed Expiry Calculation (Deadline based on Column 4).
- **Completed**: Anti-Snipping & Exploit Protection (Layout & Deadline Logic).
- **Completed**: Background Execution (Game runs when tab is blurred).
- **Completed**: Orphaned Transaction Refund Trigger (Handle bets expiring during TX mining).

## Recent Activity
- **Feature**: Updated `UIOverlay.tsx` `processBet` logic to detect "Orphaned Transactions".
  - If a bet expires (is removed from store) while the transaction is mining, the client now explicitly calls `claimServerPayout(betId)` to trigger the refund/payout process on the server.
  - This fixes the issue where late transactions were silently ignored, causing users to lose funds without a refund check.
- **Bug Fix**: Updated `checkBettingState` in `MainScene.ts` to IGNORE confirmed bets if the corresponding pending box is missing (expired locally). This prevents "Ghost Bets".
- **Visuals**: Updated `getTextFade` in `MainScene.ts` to use a mapping range of `[0.45, 0.6]`, ensuring multiplier text disappears completely before reaching the deadline.
- **Store**: Updated `confirmBet` in `gameStore.ts` to enforce `(betId, txHash)` signature and strict ID matching.

## Next Steps
- [ ] **Testing**: Verify "Ghost Bet" fix by confirming a transaction AFTER the box has crossed the deadline.
- [ ] **Testing**: Verify Text Fade ensures text is invisible before Column 4.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
