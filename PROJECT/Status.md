# Status

## Active Work
- Implemented **Euphoria Half-Screen Logic**:
    - **Camera Lock**: Head pinned to 50% screen width after initial run-up.
    - **Infinite Scroll**: Background and objects scroll left while Head stays centered.
- **High-Frequency Volatility**:
    - **Jitter System**: Added random Y-offset noise every 100ms to simulate market heartbeat.
    - **Spline Smoothing**: Used `Phaser.Curves.Spline` for liquid movement despite the jitter.
- **UI/UX Polish**:
    - **Strict Formatting**: Price always shows `$0,000.00`.
    - **Layout**: Top-Left Price, Bottom-Left Balance, Bottom-Right Bet, Top-Center Win.
    - **Glassmorphism**: Enhanced transparency and blur effects.

## Recent Activity
- Rewrote `MainScene.ts` to support infinite world coordinates with a center-locked camera.
- Implemented `jitter` logic in the update loop for visual energy.
- Updated `UIOverlay.tsx` to ensure pixel-perfect positioning of widgets.

## Next Steps
- [ ] Add "Cash Out" button for active bets (optional).
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
