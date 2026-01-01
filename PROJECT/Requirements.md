# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- **Betting System (Blockchain)**:
    - Currency: "Credits" (1:1 with Testnet USDT).
    - **Authentication**: **Privy.io** (Email, Social, Wallet).
    - **Deposit/Withdraw**: Via Shop (future integration).
- **Grid System**: 10 columns, multipliers based on probability.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick Light Purple line with Bloom.
- **Background**: Deep Magenta/Purple.
- **UI**: Glassmorphism panels, Neon accents.
- **Login Modal**: Dark theme, rounded buttons, specific "CROSSx" branding.

## Camera & Time
- Fixed Head Position (25% screen width).
- 100-second scroll window.

## Known Issues
- `VITE_PRIVY_APP_ID` needs to be set in `.env` for auth to work.
