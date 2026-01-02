# Status

## Active Work
- **Resolved Transaction Timeout**: Updated `UIOverlay.tsx` to extend `waitForTransactionReceipt` timeout to 120 seconds (was 30s) to accommodate slow testnet block times.
- **Added Transaction Feedback**: Implemented a "Confirming..." / "Please Sign..." visual indicator (Blue Spinner) so users know the app is working during the long wait time.
- **Completed**:
    - Increased retry count to 60 (Total ~2 mins).
    - Added `txStatus` state (`idle` | `signing` | `confirming`).
    - Added UI Toast for transaction status.

## Recent Activity
- **Bug Fix**: Resolved `ReferenceError: registerServerBet is not defined`.
- **UI Styling Fixes**:  
    - Increased `Trophy` and `HelpCircle` icon sizes.
    - Optimized mobile wallet UI scaling.
- **Ghost Refund Fix**: Implemented safety check for orphaned transactions.

## Next Steps
- [ ] **Testing**: Verify "White Bet Result Box" (Win Notification) typography on actual mobile device.
- [ ] **Integration**: Monitor server response times for history fetching.
- [ ] **Polishing**: Add more sound effects for Modal interactions.
