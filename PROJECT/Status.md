# Status

## Active Work
- **Completed**: Refined Ghost Bet Fix (Strict ID matching signature update).
- **Completed**: Implemented Safe Zone logic in `MainScene.ts` (Columns 0-3 are non-interactive).
- **Completed**: State Persistence (Restoring Bets on Reload).
- **Completed**: Fixed Expiry Calculation (Deadline based on Column 4).
- **Completed**: Anti-Snipping & Exploit Protection (Layout & Deadline Logic).
- **Completed**: Background Execution (Game runs when tab is blurred).

## Recent Activity
- **Store**: Updated `confirmBet` in `gameStore.ts` to enforce `(betId, txHash)` signature and strict ID matching.
- **UI**: Updated `UIOverlay.tsx` to pass `betId` correctly during confirmation.
- **Interaction**: Updated `placeBet` in `MainScene.ts` to calculate screen column index and block interaction if index <= 3 (First 4 columns).
- **Persistence**: Implemented `fetchActiveBets` in store and `restoreBets` in `MainScene`. Bets are now visually restored at correct positions using `expiryTimestamp`.
- **Logic**: Updated `placeBet` to calculate expiry based on "Distance to Column 4" instead of Head, ensuring server validation matches visual deadline.
- **Security**: Implemented "Deadline" logic in `MainScene.ts` (Pending bets invalidated at Column 4).
- **Layout**: Adjusted Grid to 7 Columns and Head Position to 22% for faster pacing.

## Next Steps
- [ ] **Testing**: Verify Safe Zones (Clicks on left side should be ignored).
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
