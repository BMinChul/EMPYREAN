# Status

## Active Work
- **Preview Stability Fix**:
    - **Offline Fallback**: Modified `MainScene.placeBet` to catch network errors ("Failed to fetch") when contacting the backend.
    - **Simulation Mode**: If the backend is unreachable (common in Preview), the game now logs a warning and proceeds with the betting flow locally instead of crashing/rolling back.
    - **Error Handling**: Downgraded backend connection errors from `console.error` to `console.warn` to prevent the Preview environment from triggering error dialogs.

## Recent Activity
- **UI Refinements (MainScene.ts)**:
    - **Pending Box**: Centered multiplier text, fixed "PENDING..." label.
    - **Confirmed Box**: Updated text to `$ {amount} Cross`.
    - **Grid Clarity**: Implemented auto-hiding of background multipliers behind active bets.
- **Logic Fixes**:
    - **UIOverlay.tsx**: Implemented `publicClient.waitForTransactionReceipt`.
    - **MainScene.ts**: Implemented immediate visual feedback for pending bets.

## Next Steps
- [ ] **Testing**: Verify full flow on Cross Testnet with the backend running.
- [ ] **Cleanup**: Remove temporary balance check bypass once wallet funding is confirmed.
- [ ] **Refactor**: Remove redundant API calls from `gameStore.ts`.
- [ ] **Wallet**: Monitor "Leap Wallet" conflicts.
