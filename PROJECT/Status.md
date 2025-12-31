# Status

## Active Work
- **Visual & Gameplay Refinements ("Euphoria" Polish)**:
    - **Betting Restrictions**: Implemented strict visibility check. Betting is disabled if the grid column's text visibility is < 40%.
    - **Betting Box UI**: 
        - Solid Pale Yellow (`#fffacd`) with White 70% Stroke.
        - **Text**: Bold Black with `$` prefix (e.g., `$10`).
        - **Glow**: Internal glow removed. External "Spread Glow" added that reacts to proximity (<250px).
    - **Current Price Box**: Enlarged to 120x45 with clean Deep Purple styling, matching the grid.
    - **Gradients**: Smoothed out the fade-in transition for the betting zone (Columns 6-10).

## Recent Activity
- Refactored `MainScene.ts` to centralize visibility logic (`getTextFade`).
- Updated collision logic to handle smooth alpha transitions for proximity glow.
- Polished UI elements for better readability and visual consistency.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
