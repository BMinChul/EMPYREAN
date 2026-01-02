# Status

## Active Work
- **UX Improvement**: Added wallet connection check before placing bets.
    - If user is not connected, clicking the grid now prompts "Please Connect Wallet to Bet" and opens the connection modal.
    - Prevents `ConnectorNotConnectedError` and failed transaction alerts.

## Recent Activity
- **Bug Fix**: Fixed wallet balance display issue.
- **Preview Stability Fix**: Added offline fallback and simulation mode.
- **UI Refinements**: Improved pending/confirmed bet box visuals.

## Next Steps
- [ ] **Testing**: Verify wallet connection prompt works as expected.
- [ ] **Testing**: Verify full betting flow with actual tCROSS tokens.
- [ ] **Cleanup**: Remove temporary debugging logs if any.
