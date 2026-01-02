# Status

## Active Work
- **Completed**: Fixed "TransactionReceiptNotFoundError" by adding retry logic (10 retries, 1s polling, 30s timeout) to `waitForTransactionReceipt` in `UIOverlay.tsx`.
- **Completed**: Fixed "Invalid Date" bug in History Modal by using `createdAt` field and full date/time formatting.
- **Completed**: Updated History Status labels to explicitly show "REFUNDED" (Orange), "WON" (Black), and "PENDING" (Gray) in the Placed tab.

## Recent Activity
- **Bug Fix**: Improved Transaction Receipt reliability by adding robust retry logic and longer timeouts.
- **UI Fix**: Resolved timestamp issue in `UIOverlay.tsx` by switching to `createdAt` property.
- **UI Polish**: Refined visual status indicators in the bet history list.
- **Backend Sync**: Bet registration now sends transaction hashes to link on-chain activity with off-chain records.
- **UI**: Added conditional styling for 'paid' bets in the history list (Golden Background/Black Text).
- **UI**: Added "Trophy" button below Price Ticker for Leaderboard access.
- **UI**: Made Wallet Balance clickable to open History.

## Next Steps
- [ ] **Testing**: Verify pagination limits (currently max 15 items per list).
- [ ] **Polishing**: Add more sound effects for Modal interactions.
- [ ] **Integration**: Monitor server response times for history fetching.
