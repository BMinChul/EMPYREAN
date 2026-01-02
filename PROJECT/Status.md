# Status

## Active Work
- **Completed**: Fixed persistent "Ghost Boxes" on tab resume using `document.addEventListener('visibilitychange')`.
- **Completed**: Disabled betting on boxes entering the "Fade Zone" (Column 5 to 4 transition).
- **Completed**: Implemented "Resume Cleanup" in `MainScene.ts` to fix stale bet boxes on tab focus.
- **Completed**: Updated Backend API URL to Replit Server.
- **Completed**: Fixed Expiry Time Calculation.
- **Completed**: Implemented Explicit Refund Flag (`isRefund`).
- **Completed**: Implemented Safe Zone logic (Columns 0-3 non-interactive).
- **Completed**: State Persistence (Restoring Bets on Reload).
- **Completed**: Anti-Snipping & Exploit Protection.

## Recent Activity
- **Fix**: Replaced `game.events.on('focus')` with `document.addEventListener('visibilitychange')` in `MainScene.ts`.
  - Ensures immediate cleanup of expired bets when tab becomes visible.
  - Iterates through both pending and active bets to remove expired ones instantly.
- **Fix**: Updated `placeBet` logic to prevent betting on boxes shifting into the "Fade Zone".
  - Calculates screen position of the snapped grid cell.
  - Blocks interaction if the cell is less than 60% across the screen (entering fade area).
- **Feature**: Added `handleGameFocus` event listener in `MainScene.ts` (Previously).

## Next Steps
- [ ] **Testing**: Verify ghost boxes are gone when resuming tab after long inactivity.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
