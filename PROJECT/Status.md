# Status

## Active Work
- **Betting Flow Logic**:
    - **Update**: Changed betting logic to "Confirm-then-Show".
    - **Visuals**: Added "Ghost Box" (Grey "SIG?") state while waiting for wallet signature.
    - **Logic**: Real Betting Box (Yellow) only spawns *after* transaction confirmation.
    - **Refund**: Failed/Rejected transactions now clear the Ghost Box and refund the balance.

## Recent Activity
- **Error Handling**:
    - Graceful handling of rejected/failed bet transactions.
    - Added `cancelBet` to `gameStore` to refund optimistic balance updates.
    - Added Error Toast notification for failed transactions.
- **Gameplay Pacing**:
    - Grid Reduced to 6 columns.
    - Time Window reduced to 60s.

## Next Steps
- [ ] **Winning Logic**: Verify if `mintAsset` works or needs replacement with a Treasury Payout system.
- [ ] **Testing**: Verify pacing feel with real users.
- [ ] **Game Loop**: Ensure `sendTransaction` works correctly with the new `wagmi` signer.
