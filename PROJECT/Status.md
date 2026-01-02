# Status

## Active Work
- **Backend Integration (Complete)**:
    - Implemented `registerServerBet` in `gameStore` to sync confirmed bets with the server.
    - Implemented `claimServerPayout` in `gameStore` for secure win claims (sending only `betId`).
    - Updated `MainScene` to trigger these actions at the correct game states.

## Recent Activity
- **MainScene.ts**: Integrated backend API calls into `createConfirmedBox` and `handleWin`.
- **gameStore.ts**: Added `registerServerBet` and `claimServerPayout` actions.
- **Betting Logic**:
    - Switched from ERC-20 to **Native CROSS Token** betting.
    - Implemented **Direct Wallet Transfer** to House Wallet.
    - Added "Pending" (Grey) -> "Confirmed" (Yellow) visual states.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Backend**: Ensure `/api/place-bet` and `/api/payout` are handling requests correctly.
- [ ] **Polish**: Add visual feedback if the backend server is unreachable.
