# Status

## Active Work
- Implemented **Euphoria Half-Screen Logic**:
    - **Camera Lock**: Head pinned to 25% screen width (Left side) and 50% height.
    - **Infinite Scroll**: Background and objects scroll left while Head stays visual fixed.
- **High-Frequency Volatility**:
    - **Jitter System**: Added random Y-offset noise for "Live" feel.
    - **Spline Smoothing**: Used `Phaser.Curves.Spline` with high-responsiveness.
- **UI/UX Polish**:
    - **Strict Formatting**: Price always shows `$0,000.00`.
    - **Layout**: "Euphoria" style with Glassmorphism and Neon Borders.
    - **Grid**: Infinite scrolling grid with right-side Multipliers.

## Recent Activity
- Rewrote `MainScene.ts` to support infinite world coordinates with a center-locked camera.
- Implemented `jitter` logic in the update loop for visual energy.
- Updated `UIOverlay.tsx` and `App.css` for the complete visual overhaul.

## Next Steps
- [ ] Add "Cash Out" button for active bets (optional).
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
