# Status

## Active Work
- **Bug Fixes**:
    - Fixed `placeBet` in `MainScene.ts` to handle server errors gracefully.
    - Added `clearPendingBet` to `gameStore.ts` to reset state on failure.

## Recent Activity
- **Backend Integration**:
    - Implemented `registerServerBet` in `gameStore` to sync confirmed bets with the server.
    - Implemented `claimServerPayout` in `gameStore` for secure win claims.
    - Added fail-safe logic to `placeBet` to prevent "stuck" pending states if the server is unreachable.
- **Betting Logic**:
    - Switched from ERC-20 to **Native CROSS Token** betting.
    - Implemented **Direct Wallet Transfer** to House Wallet.
    - Added "Pending" (Grey) -> "Confirmed" (Yellow) visual states.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Backend**: Ensure `/api/place-bet` and `/api/payout` are handling requests correctly (Idempotency might be needed).
- [ ] **Polish**: Add visual feedback (Toast) if the backend server is unreachable.
