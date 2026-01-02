# Status

## Active Work
- **Completed**: Implemented Live Leaderboard UI with polling (5s interval).
- **Completed**: Fixed persistent "Ghost Boxes" on tab resume using `document.addEventListener('visibilitychange')`.
- **Completed**: Disabled betting on boxes entering the "Fade Zone" (Column 5 to 4 transition).
- **Completed**: Implemented "Resume Cleanup" in `MainScene.ts` to fix stale bet boxes on tab focus.
- **Completed**: Updated Backend API URL to Replit Server.

## Recent Activity
- **Feature**: Added `leaderboard` state and `fetchLeaderboard` action to `gameStore.ts`.
- **UI**: Added "Top Winners" panel to `UIOverlay.tsx` (Top-Right) with Cyberpunk styling.
- **Fix**: Replaced `game.events.on('focus')` with `document.addEventListener('visibilitychange')` in `MainScene.ts`.
- **Fix**: Updated `placeBet` logic to prevent betting on boxes shifting into the "Fade Zone".

## Next Steps
- [ ] **Testing**: Verify leaderboard updates correctly with backend data.
- [ ] **UI Polish**: Add a "Server Connected" indicator in the UI.
- [ ] **Integration**: Monitor local server logs for `expiryTimestamp` validation.
