# Status

## Active Work
- **UI Refactoring (Complete)**:
    - Moved **Bet Amount Selector** to Top-Left (next to Price Ticker).
    - Unified styling for Top-Left widgets (Glassmorphism, compact).
    - Removed Bottom-Right control panel.
    - **Auto TX**: Permanently enabled (`autoBet: true` in store), removed toggle UI.

## Recent Activity
- **gameStore.ts**: Set `autoBet` default to `true`.
- **UIOverlay.tsx**: 
    - Rebuilt top-left layout to host Price + Bet Selector.
    - Removed manual "Auto TX" checkbox.
    - Validated `pointer-events` to ensure game interaction remains blocked only by UI elements, not the overlay container.
- **MainScene.ts**: Integrated backend API calls into `createConfirmedBox` and `handleWin` (Previous task).

## Next Steps
- [ ] **Testing**: Verify Bet Selector dropdown works correctly in new position.
- [ ] **Testing**: Ensure "Auto TX" flow works smoothly without manual intervention.
- [ ] **Polish**: Add visual feedback if the backend server is unreachable.
