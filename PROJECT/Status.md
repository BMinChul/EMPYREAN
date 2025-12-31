# Status

## Active Work
- **Core Logic Refinement**: 
    - Implemented **Brownian Motion-based Inverse Diffusion Model** for dynamic betting multipliers.
    - Formula: `Multiplier = BaseScale * sqrt(Time) * exp( Distance^2 / (2 * Volatility^2 * Time) )`.
    - Result: More realistic risk/reward curve where distant bets offer higher initial payouts that decay over time.
- **Bug Fixes**: 
    - Resolved discrepancy between Grid Multipliers and Betting Box Multipliers.
    - Standardized `cellCenterPrice` calculation across `drawGridAndAxis` and `placeBet` methods.

## Recent Activity
- **Visual Refinements**: Implemented dual-layer chart rendering and "Euphoira" style polish.
- **Code Fixes**: Resolved syntax errors and grid multiplier logic.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
