# Status

## Active Work
- **Gameplay Pacing Update**:
    - **Grid Reduced**: 10 columns -> 6 columns.
    - **Speed Increased**: Visible time window reduced from 100s -> 60s (results in faster scroll).
    - **Head Position**: Moved from 25% -> 40% (Aligns with "Left 3 Waiting / Right 3 Betting" split).
    - **Logic**: Betting multipliers and visibility checks adapted to new 6-col layout.

## Recent Activity
- **Native Token Integration**:
    - **Update**: Fixed Balance Display to use `useBalance` (Native tCROSS).
    - **Update**: Replaced `burnAsset` with `sendTransaction` (Native Burn).
- **Authentication Migration**:
    - Migrated to **Reown AppKit**.

## Next Steps
- [ ] **Winning Logic**: Verify if `mintAsset` works or needs replacement with a Treasury Payout system.
- [ ] **Testing**: Verify pacing feel with real users.
- [ ] **Game Loop**: Ensure `sendTransaction` works correctly with the new `wagmi` signer.
