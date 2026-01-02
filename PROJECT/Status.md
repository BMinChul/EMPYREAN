# Status

## Active Work
- **Testing**: Verifying full flow with backend server (ngrok) and new UI visuals.

## Recent Activity
- **UI Refinements (MainScene.ts)**:
    - **Pending State**: Updated pending box to Grey (`0x555555`, 0.5 Alpha) with "PENDING..." text.
    - **Confirmed State**: Updated active betting box to show `$ {amount} CROSS`.
    - **UX**: Improved "SCAN" link visibility (Blue `#0000ff` + Z-Index fix) and removed intrusive error text for rejected transactions.
- **Critical Fixes**:
    - **MainScene.ts**: 
        - Hardcoded API URL to `https://gene-fragmental-addisyn.ngrok-free.dev` in `placeBet` and `requestPayout` logic.
        - **Balance Check**: Added debug logging and temporarily DISABLED the blocking return for testing.
        - **Payouts**: Implemented direct `requestPayout` method.
- **Backend Integration**:
    - Implemented `registerServerBet` in `gameStore`.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Cleanup**: Remove temporary balance check bypass once wallet funding is confirmed.
- [ ] **Refactor**: Remove redundant API calls from `gameStore.ts`.
- [ ] **Wallet**: Monitor "Leap Wallet" conflicts.
