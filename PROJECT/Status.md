# Status

## Active Work
- **Blockchain Integration**:
    - **Fixed**: Corrected Chain ID to `612044` (Crosschain Testnet).
    - **Fixed**: Updated `useBalance` to fetch native `tCROSS` coin (removed incorrect token address).
    - **Fixed**: Added `crossTestnet` to `PrivyProvider` supported chains to ensure correct network connection.
    - Updated `UIOverlay.tsx` to fetch **tCross** token balance directly from the chain using `useBalance` with `chainId`.
- **UI Refinement**:
    - Updated Balance Widget to display "tCross" (strict casing).
    - Layout adjusted: Icon | Label -> Balance -> USD Value.
    - Bet buttons updated to match "tCross" casing.

## Recent Activity
- **Privy Integration**:
    - Replaced direct Wagmi connection with **Privy.io** for authentication.
    - Implemented new "Connect Wallet" modal.
    - Updated `UIOverlay` to use Privy hooks (`usePrivy`) for auth state.

## Next Steps
- [ ] **Critical**: Set `VITE_PRIVY_APP_ID` in `.env`.
- [ ] Verify `useGameServer` compatibility with Privy's wallet provider.
- [ ] Implement dynamic token price fetching (currently using store value).
- [ ] Add "Cash Out" button for active bets.
