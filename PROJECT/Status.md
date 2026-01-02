# Status

## Active Work
- **Bug Fix**: Resolved `ReferenceError: registerServerBet is not defined` in `UIOverlay.tsx` by adding the missing destructuring from `useGameStore`.
- **UI Styling Fixes (Urgent)**:  
    - **Icon Visibility**: Forced `Trophy` and `HelpCircle` icons to `size={80}` and removed container size constraints (using `p-2` instead) to ensure they are large and clearly visible as requested.
    - **Ghost Refund Fix**: Implemented a safety check in `processBet`. Now, server refund/cancel logic (`cancelBet`) is ONLY triggered if a `txHash` was generated. If the user rejects the transaction (no hash), we only clear the local state (`clearPendingBet`) to prevent the server from attempting to refund money it never received.
- **Error Handling**: Suppressed `TransactionReceiptNotFoundError` in preview mode by logging it as a warning instead of an error, preventing the red overlay from blocking gameplay during network congestion.

## Recent Activity
- **UI Polish**: Completed fix for "Tiny Icons" on PC and "Massive Wallet UI" on Mobile.
    - **Icon Size**: Increased `Trophy` and `HelpCircle` icon sizes to `40px` (from 36px) to ensure visibility.
    - **Mobile Optimization**: Applied `scale-75 origin-bottom-left md:scale-100` to bottom wallet UI.
    - **Compact Layout**: Reduced padding and font sizes for wallet connection UI on mobile screens.
- **Audio Update**: Replaced the "Bet Win" sound effect with a new 1-second short, punchy arcade chime.

## Next Steps
- [ ] **Testing**: Verify "White Bet Result Box" (Win Notification) typography on actual mobile device.
- [ ] **Integration**: Monitor server response times for history fetching.
- [ ] **Polishing**: Add more sound effects for Modal interactions.
