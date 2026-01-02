# Status

## Active Work
- **Testing**: Verifying full flow with backend server (ngrok).

## Recent Activity
- **Critical Fixes**:
    - **MainScene.ts**: 
        - Hardcoded API URL to `https://gene-fragmental-addisyn.ngrok-free.dev` in `placeBet` and `requestPayout` logic.
        - **Balance Check**: Added debug logging and temporarily DISABLED the blocking return for testing (allows bets with 0 balance).
        - **Payouts**: Implemented direct `requestPayout` method in `MainScene` to handle server calls, replacing indirect store calls.
- **Bug Fixes**:
    - Fixed `placeBet` to handle server errors gracefully (Rollback + UI Feedback).
    - Verified `clearPendingBet` exists in `gameStore.ts`.
- **Backend Integration**:
    - Implemented `registerServerBet` in `gameStore` (now redundant but kept for safety).
    - Implemented `claimServerPayout` in `gameStore` (replaced by direct call in Scene).

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Cleanup**: Remove temporary balance check bypass once wallet funding is confirmed.
- [ ] **Refactor**: Remove redundant API calls from `gameStore.ts` if `MainScene` is handling them correctly.
- [ ] **Wallet**: Monitor "Leap Wallet" conflicts; consider enforcing injected provider in `wagmi.ts` if issues persist.
