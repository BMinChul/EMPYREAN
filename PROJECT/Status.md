# Status

## Active Work
- **Preview Error Fix**: 
    - Resolved `TypeError: Failed to fetch` in `registerServerBet`.
    - Downgraded API connection errors from Critical (Error) to Warning (Warn) to support Offline/Preview modes gracefully.
    - Added response status checks to `gameStore.ts` server interactions.
- **Audio Integration**: 
    - Replaced default audio with custom assets: `win.wav`, `bet.wav`, `main_bgm.mp3`.
    - Tuned BGM volume to 0.3 and enabled looping.
- **Resolved "Late Transaction" Scenario**: Updated `UIOverlay.tsx` logic to intelligently handle bets that confirm on-chain after the game round has closed.
- **Optimized Timeout**: Reduced `waitForTransactionReceipt` timeout from 120s to **45s** to match game pacing better.

## Recent Activity
- **Automatic Refund Feedback**: 
    - Added logic to check `expiryTimestamp` immediately after transaction confirmation.
    - If transaction is late (`now > expiry`), automatically triggers `cancelBet` (Refund) and shows a clear toast message: "Round ended during transaction. Refunding...".
    - Handled Timeout Errors by assuming the transaction *might* eventually confirm, thus triggering a safety refund check.
- **Fixed Modal Interaction**: Added `pointer-events-auto` to modal backdrops (Leaderboard, Guide, History) so "Close on Click" works correctly.
- **Bug Fix**: Resolved `ReferenceError: registerServerBet is not defined`.
- **UI Styling Fixes**:  
    - Increased `Trophy` and `HelpCircle` icon sizes.
    - Optimized mobile wallet UI scaling.
- **Ghost Refund Fix**: Implemented safety check for orphaned transactions.
- **Backend Sync**: Updated `gameStore.ts` API calls to include `txHash` in payout requests.

## Next Steps
- [ ] **Testing**: Verify "White Bet Result Box" (Win Notification) typography on actual mobile device.
- [ ] **Integration**: Monitor server response times for history fetching.
- [x] **Polishing**: Add more sound effects for Modal interactions.
- [x] **UX Improvement**: Modals (Leaderboard, Guide, History) now close when clicking the backdrop.
