# Status

## Active Work
- **Token Balance Fix**:
    - **Issue**: Token balance was showing as 0 because the UI was looking for asset key `'tcross'` while the server configuration (`.crossramp`) used `'credits'`.
    - **Fix**: Updated `UIOverlay.tsx` to use `'credits'` asset key for balance synchronization, burning (betting), and minting (winning).
    - **Result**: Game should now correctly display the balance from the game server.

## Recent Activity
- **Authentication Migration**:
    - Migrated to **Reown AppKit (WalletConnect)**.
    - Replaced `PrivyProvider` with `WagmiProvider`.
- **Loading Screen/Crash Fix**:
    - Implemented `ConfigError` component.
- **Privy Removal**: Completely uninstalled `@privy-io` packages.

## Next Steps
- [ ] **Verify**: Check if balance updates correctly on betting/winning.
- [ ] **Testing**: Test connection with OKX Wallet and MetaMask on Cross Testnet.
- [ ] **Game Loop**: Ensure `burnAsset`/`mintAsset` works correctly with the new `wagmi` signer.
