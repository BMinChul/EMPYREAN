# Status

## Active Work
- **Completed**: Fixed "Pending Box" turning yellow too early.
    - Now waits for `waitForTransactionReceipt` (Block Confirmation) before switching visual state.
- **Completed**: Fixed Text Overlap in Pending Box.
    - Moved "PENDING..." text to bottom.
    - Added Multiplier text to center of Pending Box for better context.
- **Completed**: UI Text Refinements.
    - **Pending Box**: Moved Multiplier text (e.g., 2.50x) to the **top** of the box.
    - **Confirmed Box**: Changed format to `$ {amount} Cross` (e.g., "$1 Cross").
    - **Bet Selector**: Renamed "CR" to "Cross" (Case-sensitive) in the UI Overlay.

## Recent Activity
- **UI Refinements (MainScene.ts)**:
    - **Visual Feedback Timing**: Enforced **IMMEDIATE** creation of the "PENDING..." grey box before any network calls (API/Wallet) to ensure responsiveness.
    - **Text Formatting**: Fixed confirmed bet display to `$10 Cross` (added $ sign, changed CROSS to Cross).
    - **Pending State**: Grey (`0x555555`, 0.5 Alpha) with "PENDING..." text at bottom, Multiplier at top.
    - **Confirmed State**: Yellow (#fffacd) with `$ {amount} Cross` and high-contrast Blue "SCAN" link.
- **Logic Fixes**:
    - **UIOverlay.tsx**: Implemented `publicClient.waitForTransactionReceipt` to ensure "Active" state only triggers on actual blockchain success.
- **Backend Integration**:
    - Implemented `registerServerBet` in `gameStore`.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Cleanup**: Remove temporary balance check bypass once wallet funding is confirmed.
- [ ] **Refactor**: Remove redundant API calls from `gameStore.ts`.
- [ ] **Wallet**: Monitor "Leap Wallet" conflicts.
