# Status

## Active Work
- **Resolved Transaction Timeout**: Updated `UIOverlay.tsx` to extend `waitForTransactionReceipt` timeout to 120 seconds (was 30s) to accommodate slow testnet block times.
- **Added Transaction Feedback**: Implemented a "Confirming..." / "Please Sign..." visual indicator (Blue Spinner) so users know the app is working during the long wait time.
- **Refund Logic Update**: Passed `txHash` to `cancelBet` and `claimServerPayout` to ensure valid refunds are processed by the server when transactions fail or time out.

## Recent Activity
- **Bug Fix**: Resolved `ReferenceError: registerServerBet is not defined`.
- **UI Styling Fixes**:  
    - Increased `Trophy` and `HelpCircle` icon sizes.
    - Optimized mobile wallet UI scaling.
- **Ghost Refund Fix**: Implemented safety check for orphaned transactions.
- **Backend Sync**: Updated `gameStore.ts` API calls to include `txHash` in payout requests.

## Next Steps
- [ ] **Testing**: Verify "White Bet Result Box" (Win Notification) typography on actual mobile device.
- [ ] **Integration**: Monitor server response times for history fetching.
- [ ] **Polishing**: Add more sound effects for Modal interactions.
