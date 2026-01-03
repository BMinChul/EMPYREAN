# Status

## Active Work
- **Critical Bug Fix: Tab Minimize Auto-Refund**:
    - **Fixed**: Removed client-side "cleanup" logic in `MainScene.ts` that was auto-refunding active bets when the tab was backgrounded.
    - **Improved**: `handleVisibilityChange` now triggers a `restoreBets()` sync to fetch the latest bet status (Win/Loss) from the server instead of destroying them.
    - **Safety**: `restoreBets` is now idempotent (checks for duplicates).
    - **Transaction Handling**: `UIOverlay.tsx` no longer calls `cancelBet` (refund) if a transaction times out but has a `txHash`. It now uses `resetPendingBet` to unlock the UI while letting the blockchain process the transaction.
- **Robust Transaction Handling**: 
    - Increased `waitForTransactionReceipt` timeout to **120s**.
    - Implemented specific error handling for `TransactionReceiptNotFoundError`.
    - UI now displays "Network Congested. Check Wallet" instead of generic error when receipt is delayed.

## Recent Activity
- **Preview Error Fix**: Resolved `TypeError: Failed to fetch` in `registerServerBet` by handling offline mode gracefully.
- **Audio Integration**: Added `win.wav`, `bet.wav`, `main_bgm.mp3`.
- **Resolved "Late Transaction" Scenario**: Updated `UIOverlay.tsx` logic to intelligently handle bets that confirm on-chain after the game round has closed.

## Next Steps
- [ ] **Testing**: Verify that minimizing the tab for >60s and returning does NOT refund active bets.
- [ ] **Testing**: Verify "Network Congested" toast appears correctly under simulated delay.
- [ ] **Integration**: Monitor server response times for history fetching.
