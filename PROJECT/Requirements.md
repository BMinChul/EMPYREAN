# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- **Betting System (Blockchain)**:
    - Currency: "**CROSS**" (Native Token of Cross Testnet).
    - **Flow**: User clicks grid -> Auto Sign Transaction -> House Wallet.
    - **Payout**: Automated Backend Airdrop on Win.
    - **Auto TX**: Always ON (No manual toggle).
- **Grid System**: 6 columns (Faster Pacing).
    - Left 3 cols: History/Waiting.
    - Right 3 cols: Future/Betting.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick Light Purple line with Bloom.
- **Background**: Deep Magenta/Purple.
- **UI**: Glassmorphism panels, Neon accents.
- **Top Left Layout**:
    - [Price Ticker] [Bet Amount Selector]
    - Compact, unified height.
- **Bet Box**:
    - **Pending**: Grey (Alpha 0.5), Text "PENDING..." (Bottom), Multiplier (Center).
    - **Active**: Yellow (#fffacd), Text "$ 10 Cross", Multiplier, "🔗 SCAN" Link.

## Camera & Time
- **Head Position**: Fixed at **40%** of screen width.
- **Time Window**: **60-second** visible history/future window (Faster scroll).

## Backend Integration
- **Payout Endpoint**: `https://gene-fragmental-addisyn.ngrok-free.dev/api/payout` (POST).
- **Payload**: `{ userAddress, amount, betId }`.
