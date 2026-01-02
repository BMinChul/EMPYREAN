# Status

## Active Work
- **Completed**: Fixed "Waiting Zone" Interaction (Blocked clicks in Cols 0-3).
- **Completed**: Fixed Multiplier Visibility (Full Alpha in Cols 4-6).
- **Completed**: State Persistence (Restoring Bets on Reload).
- **Completed**: Fixed Expiry Calculation (Deadline based on Column 4).
- **Completed**: Anti-Snipping & Exploit Protection (Layout & Deadline Logic).
- **Completed**: Ghost Bet Bug Fix (Strict Transaction ID Matching).
- **Completed**: Background Execution (Game runs when tab is blurred).

## Recent Activity
- **Interaction**: Updated `MainScene.placeBet` to strictly ignore clicks in the first 4 columns (Indices 0-3).
- **Visuals**: Updated `MainScene.getTextFade` and `drawGridAndAxis` to force Alpha 1.0 for multipliers in the Betting Zone (Index 4+).
- **Persistence**: Implemented `fetchActiveBets` in store and `restoreBets` in `MainScene`. Bets are now visually restored at correct positions using `expiryTimestamp`.
- **Logic**: Updated `placeBet` to calculate expiry based on "Distance to Column 4" instead of Head, ensuring server validation matches visual deadline.
- **Security**: Implemented "Deadline" logic in `MainScene.ts` (Pending bets invalidated at Column 4).
- **Layout**: Adjusted Grid to 7 Columns and Head Position to 22% for faster pacing.

## Next Steps
- [ ] **Testing**: Verify "Deadline" logic with slow transactions (ensure visual invalidation).
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
