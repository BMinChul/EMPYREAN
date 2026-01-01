# Status

## Active Work
- **Error Handling**:
    - **Fix**: Implemented graceful handling for rejected/failed bet transactions.
    - **Fix**: Added `cancelPendingBet` to `gameStore` to refund optimistic balance updates on error.
    - **UI**: Added Error Toast notification for failed transactions (e.g., "Bet Cancelled by User").
    - **Loop Prevention**: Fixed issue where failed bets would infinitely retry.

## Recent Activity
- **Gameplay Pacing Update**:
    - Grid Reduced to 6 columns.
    - Time Window reduced to 60s (Faster scroll).
    - Head Position moved to 40%.
- **Native Token Integration**:
    - Fixed Balance Display to use `useBalance` (Native tCROSS).
    - Replaced `burnAsset` with `sendTransaction` (Native Burn).

## Next Steps
- [ ] **Winning Logic**: Verify if `mintAsset` works or needs replacement with a Treasury Payout system.
- [ ] **Testing**: Verify pacing feel with real users.
- [ ] **Game Loop**: Ensure `sendTransaction` works correctly with the new `wagmi` signer.
