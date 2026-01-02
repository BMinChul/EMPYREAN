# Status

## Active Work
- **Testing**: Verifying full flow with backend server (ngrok) and refined UI visuals.

## Recent Activity
- **UI Refinements (MainScene.ts)**:
    - **Visual Feedback Timing**: Enforced **IMMEDIATE** creation of the "PENDING..." grey box before any network calls (API/Wallet) to ensure responsiveness.
    - **Text Formatting**: Fixed confirmed bet display to `$10 CROSS` (removed extra space).
    - **Pending State**: Grey (`0x555555`, 0.5 Alpha) with "PENDING..." text.
    - **Confirmed State**: Yellow (#fffacd) with `$ {amount} CROSS` and high-contrast Blue "SCAN" link.
- **Critical Fixes**:
    - **MainScene.ts**: Hardcoded API URL to `ngrok` for testing, implemented direct `requestPayout`.
    - **Balance Check**: Temporarily disabled for smoother testing flow.
- **Backend Integration**:
    - Implemented `registerServerBet` in `gameStore`.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Cleanup**: Remove temporary balance check bypass once wallet funding is confirmed.
- [ ] **Refactor**: Remove redundant API calls from `gameStore.ts`.
- [ ] **Wallet**: Monitor "Leap Wallet" conflicts.
