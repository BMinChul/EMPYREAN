# Status

## Active Work
- **Betting Flow Logic**:
    - **Update**: Changed betting logic to support "Auto Transaction" toggle.
    - **Bet Sizes**: Updated standard bet sizes to micro-transactions ($0.01 - $5.00) to support 0.1 tCROSS bets.
    - **Auto-Tx**: Added Checkbox to toggle between "One-Click Wallet Popup" and "Confirm Button -> Wallet Popup".
    - **Manual Confirm**: Added a central "CONFIRM BET" button for safer manual betting.

## Recent Activity
- **Error Handling**:
    - Graceful handling of rejected/failed bet transactions.
    - Added `cancelBet` to `gameStore` to refund optimistic balance updates.
    - Added Error Toast notification for failed transactions.
- **Gameplay Pacing**:
    - Grid Reduced to 6 columns.
    - Time Window reduced to 60s.

## Next Steps
- [ ] **Winning Logic**: Verify if `mintAsset` works correctly for payouts.
- [ ] **Testing**: Test the "Auto Tx" flow with real wallet interactions.
- [ ] **Game Loop**: Ensure `sendTransaction` works correctly with the new `wagmi` signer.
