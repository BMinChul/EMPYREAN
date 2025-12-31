# Status

## Active Work
- **Completed**: Implemented Inverse Gaussian PDF Model for multiplier calculation.
    - Formula: `Multiplier = BaseScale * sqrt(t) * exp( x^2 / (2 * sigma^2 * t) ) * (1 - HouseEdge)`
    - Constants: Sigma=0.7, BaseScale=0.85, HouseEdge=0.05.
    - UI: Ensured grid multipliers perfectly match betting box multipliers.

## Recent Activity
- **Visual Refinements**: Implemented dual-layer chart rendering and "Euphoira" style polish.
- **Code Fixes**: Resolved syntax errors and grid multiplier logic.
- **Math Model Update**: Switched from Brownian Motion Inverse Diffusion to Inverse Gaussian PDF for better risk/reward balance.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
