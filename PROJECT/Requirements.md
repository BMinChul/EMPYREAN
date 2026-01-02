# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- **Betting System (Blockchain)**:
    - Currency: "**tCROSS**" (Native Token of Cross testnet).
    - **Authentication**: **Reown AppKit** (WalletConnect v3).
    - **Deposit/Withdraw**: Via Shop (future integration).
- **Grid System**: 6 columns (Faster Pacing).
    - Left 3 cols: History/Waiting.
    - Right 3 cols: Future/Betting.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick Light Purple line with Bloom.
- **Background**: Deep Magenta/Purple.
- **UI**: Glassmorphism panels, Neon accents.
- **Login**: Reown AppKit Modal (Dark theme, Euphoria Green accents).

## Camera & Time
- **Head Position**: Fixed at **40%** of screen width.
- **Time Window**: **60-second** visible history/future window (Faster scroll).

## Known Issues
- `VITE_REOWN_PROJECT_ID` should be set in `.env` for production use.
