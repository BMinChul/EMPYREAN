# Status

## Active Work
- **Gameplay Tuning**:
    - **Grid**: Reduced from 10 to 6 columns (Left 3: Wait, Right 3: Bet).
    - **Speed**: Reduced time window from 100s to 60s for faster pacing.
    - **Screen**: Changed to fixed 1024x576 resolution (Scale.FIT) for a more compact view.
    - **Head Position**: Moved to center (50%) to separate History and Betting zones evenly.

## Recent Activity
- **Native Token Integration**:
    - Fixed Balance Display to use `useBalance` (Native tCROSS).
    - Replaced `burnAsset` with `sendTransaction` (Native Burn) for betting.
- **Token Balance Fix**:
    - `UIOverlay.tsx` now syncs with `wagmi` native balance.
- **Betting Logic**:
    - `UIOverlay.tsx` now performs a real blockchain transaction for betting.

## Next Steps
- [ ] **Winning Logic**: Verify if `mintAsset` works or needs replacement with a Treasury Payout system (currently simulation).
- [ ] **Testing**: Test connection with OKX Wallet and MetaMask on Cross Testnet.
- [ ] **Game Loop**: Ensure `sendTransaction` works correctly with the new `wagmi` signer.
