# Status

## Active Work
- **Visual Polish ("Euphoria" Style)**:
    - **Graph**: Thickened line to **40px** (`0xE0B0FF`) for high visibility.
    - **Bloom**: Moved bloom from Global Camera to specific layers (Chart/Grid only).
    - **Betting Box**: 
        - Solid Pale Yellow (`#fffacd`) with NO internal glow.
        - **Text**: Bold, Black, with `$` prefix (e.g., `$10`). crisp readability.
        - **Proximity**: Implemented "Spread Glow" that only appears when the graph head is near (`< 250px`).

## Recent Activity
- Refactored `MainScene.ts` to implement specific visual requests.
- Optimized rendering to prevent text washout.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
