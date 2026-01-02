# Status

## Active Work
- **Betting Logic Overhaul (Complete)**:
    - Switched from ERC-20 to **Native CROSS Token** betting.
    - Implemented **Direct Wallet Transfer** to House Wallet.
    - Added "Pending" (Grey) -> "Confirmed" (Yellow) visual states.
    - Added "🔗 SCAN" link to confirmed betting boxes.
- **Payout System (Complete)**:
    - Removed client-side minting.
    - Implemented **Backend API Call** on Win (`/api/payout`).
- **UI/UX Refactor (Complete)**:
    - **Bet Selector**: Replaced buttons with a **Dropdown** (0.1, 0.5, 1, 5, 10 CROSS).
    - **Balance**: Updated to show Native CROSS Balance.

## Recent Activity
- **MainScene.ts**: Updated `placeBet` logic, added `createConfirmedBox` with explorer link, added `handleWin` API integration.
- **UIOverlay.tsx**: Rewrote widget panels for new designs, implemented `wagmi` sendTransaction for native tokens.
- **gameStore.ts**: Refactored to support CROSS tokens and store `userAddress` / `txHash`.

## Next Steps
- [ ] **Testing**: Verify transaction flow on Cross Testnet.
- [ ] **Backend**: Ensure the backend API is reachable and processing payouts correctly.
- [ ] **Polish**: Add more sound effects for "Pending" vs "Confirmed" states.
