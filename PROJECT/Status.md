# Status

## Active Work
- **Completed**: 
    - Enhanced Wallet Connection UI: Added Account ID display and Disconnect button to verify real session state.
    - Integrated Cross SDK for wallet connection (`useGameServer`).
    - Implemented `tCROSS` token balance display with USD valuation.
    - Added Help Popup with guide on getting tCROSS tokens.
    - Refactored Betting Logic:
        - Bets are placed in USD ($1-$100).
        - Converted to `tCROSS` at current token price ($0.10 static for testnet).
        - Wins are calculated in USD and minted as `tCROSS`.
    - Assets: Added tCROSS and Info icons.

## Recent Activity
- **Blockchain**: Switched asset key from `credits` to `tcross`.
- **UI**: Added "Connect Wallet" state handling in `UIOverlay`.

## Next Steps
- [ ] Implement dynamic token price fetching (if API available).
- [ ] Add "Cash Out" button for active bets.
- [ ] Implement Leaderboard for biggest single win.
- [ ] Add background music (Ambient/Cyberpunk).
