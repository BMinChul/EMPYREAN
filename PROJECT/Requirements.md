# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- **Betting System (Blockchain)**:
    - Currency: "**tCROSS**" (Native Token of Cross testnet).
    - **Authentication**: **Reown AppKit** (WalletConnect v3).
    - **Deposit/Withdraw**: Via Shop (future integration).
- **Grid System**: 10 columns, multipliers based on probability.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick Light Purple line with Bloom.
- **Background**: Deep Magenta/Purple.
- **UI**: Glassmorphism panels, Neon accents.
- **Login**: Reown AppKit Modal (Dark theme, Euphoria Green accents).

## Camera & Time
- Fixed Head Position (25% screen width).
- 100-second scroll window.

## Known Issues
- `VITE_REOWN_PROJECT_ID` should be set in `.env` for production use.
