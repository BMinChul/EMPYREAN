# Status

## Active Work
- **Visual Refinements (User Feedback)**:
    - **Graph**: Set to **12px** Solid Light Purple Line (`0xE0B0FF`) for better visibility without artifacts.
    - **Betting Box**: 
        - Removed ALL glow effects (strict "No Glow" rule).
        - Added `$` symbol to price text (e.g., "$10").
        - Replaced proximity glow with a subtle **scale-up** effect (1.05x) when approaching.
    - **Text**: Ensured black text is always opaque and on top of the solid pale yellow box.

## Recent Activity
- Modified `MainScene.ts` to implement strict visual rules.
- Removed unused glow texture logic from betting boxes.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
