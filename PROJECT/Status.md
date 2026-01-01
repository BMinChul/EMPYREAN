# Status

## Active Work
- **Completed**: Fixed "Stuck on Loading" issue by implementing Simulation Mode fallback.
    - Added `isSimulation` state to `MainScene`.
    - Implemented `startSimulation()` with Random Walk logic.
    - Added 3-second timeout: If OKX feed fails, game auto-starts in simulation mode.
    - Updated `OKXService` to expose connection status.

## Recent Activity
- **Fix**: Added `GameserverProvider` to `main.tsx` to resolve "Missing auth token" error in Shop.
- **Blockchain**: Switched logic to treat "Credits" asset as "tCROSS".
- **UI**: Added Info button `(!)` and improved Wallet/Balance visibility.
- **Store**: Added `requestBet` and `requestWin` actions with currency conversion.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
