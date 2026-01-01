# Status

## Active Work
- **Wallet Integration**:
    - Replaced GameServer embedded wallet (random/guest) with **Wagmi/Viem Direct Wallet Connection** (MetaMask, etc.).
    - GameServer now auto-connects in background for logic/assets.
    - UI "Connect Wallet" button now triggers real Web3 wallet connection.
    - Displaying real wallet address (0x...) instead of Session ID.
- **UI Adjustments**: 
    - **Hidden**: "Deposit" (Shop) and "Swap" (Forge) buttons temporarily hidden.
    - **Wallet**: Real player direct wallet connection implemented.

## Recent Activity
- **Infrastructure**: Installed `wagmi`, `viem`, `@tanstack/react-query`.
- **Code**: Created `wagmi.ts`, updated `main.tsx` providers, refactored `UIOverlay.tsx`.
- **UI**: Modified `UIOverlay.tsx` to comment out Deposit/Swap buttons and disable Shop click on token icon.
- **Blockchain**: Switched asset key from `credits` to `tcross`.

## Next Steps
- [ ] Implement dynamic token price fetching (if API available).
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
- [ ] Re-enable Deposit/Swap when "real" wallet connection flow is finalized or requested.
