# Status

## Active Work
- **Completed**: Pending Box UI Refinements.
    - **Centered Multiplier**: Moved multiplier text to the exact center of the Pending Box.
    - **Smart Hiding**: Background grid multipliers are now hidden ONLY behind Pending/Active boxes to prevent text overlap.
    - **Auto-Restore**: Background multipliers reappear immediately if a bet is cancelled or rejected.
    - **Currency Format**: Updated Confirmed Box to display `$ {amount} Cross` (e.g., "$ 1 Cross").

## Recent Activity
- **UI Refinements (MainScene.ts)**:
    - **Visual Feedback Timing**: Enforced **IMMEDIATE** creation of the "PENDING..." grey box before any network calls.
    - **Text Formatting**: Fixed confirmed bet display to `$10 Cross`.
    - **Pending State**: Grey (`0x555555`, 0.5 Alpha) with "PENDING..." text at bottom.
- **Logic Fixes**:
    - **UIOverlay.tsx**: Implemented `publicClient.waitForTransactionReceipt`.
- **Backend Integration**:
    - Implemented `registerServerBet` in `gameStore`.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Cleanup**: Remove temporary balance check bypass once wallet funding is confirmed.
- [ ] **Refactor**: Remove redundant API calls from `gameStore.ts`.
- [ ] **Wallet**: Monitor "Leap Wallet" conflicts.
