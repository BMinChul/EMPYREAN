# Status

## Active Work
- **Completed Visual Overhaul & Logic Upgrade**:
    - **Graph Thickness**: Increased line width to 5px for better visibility.
    - **Dynamic Multipliers**: Implemented the "Gemini Logic" (Volatility-based).
        - Center Grid: Multipliers *increase* over time (Rightward).
        - Edge Grid: Multipliers *decrease* over time (Rightward).
        - All values update dynamically based on real-time price distance.
    - **Bet Box Aesthetics**: 
        - Removed internal glow and borders. Now pure "Solid Pale Yellow".
        - Replaced "Yellow Circle" proximity effect with a **Natural Rectangular Pulse** behind the box.

## Recent Activity
- Modified `MainScene.ts` to implement the advanced probability math for multipliers and refine the rendering loop.

## Next Steps
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
