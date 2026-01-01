# Status

## Active Work
- **Native Token Integration**:
    - **Update**: Removed "Add to Wallet" functionality for tCROSS in `UIOverlay.tsx`.
    - **Reasoning**: tCROSS is the native gas token of the network, so it doesn't need to be added as an ERC20 token.
    - **UI**: Balance display now treats tCROSS purely as the native asset.

## Recent Activity
- **Token Address Integration**:
    - Configured `UIOverlay.tsx` to handle tCROSS as native token.
- **Token Balance Fix**:
    - Updated `UIOverlay.tsx` to use `'credits'` asset key for balance synchronization.
- **Authentication Migration**:
    - Migrated to **Reown AppKit (WalletConnect)**.
    - Replaced `PrivyProvider` with `WagmiProvider`.

## Next Steps
- [ ] **Verify**: Check if balance updates correctly on betting/winning.
- [ ] **Testing**: Test connection with OKX Wallet and MetaMask on Cross Testnet.
- [ ] **Game Loop**: Ensure `burnAsset`/`mintAsset` works correctly with the new `wagmi` signer.
