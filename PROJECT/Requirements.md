# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- **Betting System (Blockchain)**:
    - Currency: "Credits" (1:1 with Testnet USDT).
    - **Deposit**: User swaps USDT for Credits via Shop.
    - **Bet**: Deducts (Burns) Credits.
    - **Win**: Adds (Mints) Credits.
    - **Withdraw**: User swaps Credits for USDT via Shop.
- **Grid System**: 10 columns, multipliers based on probability.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick Light Purple line with Bloom.
- **Background**: Deep Magenta/Purple.
- **UI**: Glassmorphism panels, Neon accents.
- **Feedback**:
    - Win: Pulse effect, floating text, top notification.
    - Balance: Shows "Credits (USDT)" in real-time.

## Camera & Time
- Fixed Head Position (25% screen width).
- 100-second scroll window.

## Known Issues
- Optimistic UI updates might revert if server transaction fails (handled via error catch).
