# Status

## Active Work
- **Authentication Migration**:
    - **Issue**: Privy was causing continuous configuration errors and timeouts.
    - **Fix**: Migrated to **Reown AppKit (WalletConnect)** for broader wallet support (OKX, MetaMask, etc.) and stability.
    - **Implementation**:
        - Replaced `PrivyProvider` with `WagmiProvider` + `wagmiAdapter`.
        - Updated `UIOverlay.tsx` to use `useAppKit` for connection.
        - Removed `LoginModal.tsx` in favor of AppKit's native modal.

## Recent Activity
- **Loading Screen/Crash Fix**:
    - Implemented `ConfigError` component to catch missing `VITE_REOWN_PROJECT_ID`.
- **Privy Removal**: Completely uninstalled `@privy-io` packages.

## Next Steps
- [ ] **Verify**: User needs to set `VITE_REOWN_PROJECT_ID` in `.env` (currently using a fallback/test ID).
- [ ] **Testing**: Test connection with OKX Wallet and MetaMask on Cross Testnet.
- [ ] **Game Loop**: Ensure `burnAsset`/`mintAsset` works correctly with the new `wagmi` signer.
