# Status

## Active Work
- Implemented **Vertical Climber** Gameplay:
    - **Inverted Axis**: Time moves vertically (Y-axis), Price moves horizontally (X-axis).
    - **Liquid Physics**: Used Spline curves for smooth vertical growth.
    - **Camera Tracking**: Auto-scrolls vertically to keep the "Head" of the line in the top quartile.
    - **Neon Visuals**: Added strong Bloom FX and a Particle Emitter trailing the head.
- **Betting System Update**:
    - Logic adapted for vertical progression (Future = Above Head).
    - Multiplier calculates based on "Altitude" (Y-distance).
- **Audio & Feedback**:
    - Integrated Win/Place/Error SFX.
    - Added Floating Text for rewards.

## Recent Activity
- Rewrote `MainScene.ts` completely to switch from Horizontal Chart to Vertical Climber.
- Updated `index.css` to match game background color.
- Tuned `pixelPerDollar` and `pixelPerSecond` for gameplay balance.

## Next Steps
- [ ] Add "Cash Out" button for early exit (optional).
- [ ] Add visual "Milestone lines" (e.g., every $100 height).
- [ ] Implement Leaderboard for highest altitude reached.
