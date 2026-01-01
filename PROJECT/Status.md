# Status

## Active Work
- **UI Adjustments**: 
    - **Hidden**: "Deposit" (Shop) and "Swap" (Forge) buttons temporarily hidden as per user request.
    - **Wallet**: Focus on "Connect Wallet" flow (currently uses GameServer SDK embedded wallet).

## Recent Activity
- **UI**: Modified `UIOverlay.tsx` to comment out Deposit/Swap buttons and disable Shop click on token icon.
- **Blockchain**: Switched asset key from `credits` to `tcross`.
- **UI**: Added "Connect Wallet" state handling in `UIOverlay`.

## Next Steps
- [ ] Implement dynamic token price fetching (if API available).
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
- [ ] Re-enable Deposit/Swap when "real" wallet connection flow is finalized or requested.
