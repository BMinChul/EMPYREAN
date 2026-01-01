# Status

## Active Work
- **Native Token Integration**:
    - **Update**: Fixed Balance Display to use `useBalance` (Native tCROSS) instead of `assets['credits']`.
    - **Update**: Replaced `burnAsset` with `sendTransaction` (Native Burn to 0x...dEaD) for betting.
    - **Reasoning**: User reported "Balance 0" while having tCROSS. The game was incorrectly looking for a 'credits' asset.

## Recent Activity
- **Token Balance Fix**:
    - `UIOverlay.tsx` now syncs with `wagmi` native balance.
- **Betting Logic**:
    - `UIOverlay.tsx` now performs a real blockchain transaction for betting.
- **Authentication Migration**:
    - Migrated to **Reown AppKit (WalletConnect)**.
    - Replaced `PrivyProvider` with `WagmiProvider`.

## Next Steps
- [ ] **Winning Logic**: Verify if `mintAsset` works or needs replacement with a Treasury Payout system (currently simulation).
- [ ] **Testing**: Test connection with OKX Wallet and MetaMask on Cross Testnet.
- [ ] **Game Loop**: Ensure `sendTransaction` works correctly with the new `wagmi` signer.
