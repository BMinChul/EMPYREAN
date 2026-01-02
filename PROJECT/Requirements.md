# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- **Betting System (Blockchain)**:
    - Currency: "**CROSS**" (Native Token of Cross Testnet).
    - **Flow**: User signs transaction -> House Wallet.
    - **Payout**: Automated Backend Airdrop on Win.
- **Grid System**: 6 columns (Faster Pacing).
    - Left 3 cols: History/Waiting.
    - Right 3 cols: Future/Betting.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick Light Purple line with Bloom.
- **Background**: Deep Magenta/Purple.
- **UI**: Glassmorphism panels, Neon accents.
- **Bet Box**:
    - **Pending**: Grey (Alpha 0.5), Text "SIGN...".
    - **Active**: Yellow (#fffacd), Text "Amount CR", Multiplier, "🔗 SCAN" Link.

## Camera & Time
- **Head Position**: Fixed at **40%** of screen width.
- **Time Window**: **60-second** visible history/future window (Faster scroll).

## Backend Integration
- **Payout Endpoint**: `https://gene-fragmental-addisyn.ngrok-free.dev/api/payout` (POST).
- **Payload**: `{ userAddress, amount, betId }`.
