# Context

## Project Overview
Crypto Arcade: Real-time ETH price betting game ("Euphoria" Style).
User bets on future price points using Native Blockchain Tokens (**CROSS**).
Chart scrolls horizontally. Win if price line hits the betting box.

## Tech Stack
- React + Vite
- Phaser 3 (Game Engine)
- Zustand (State Management)
- WebSocket (OKX API for Data: ETH-USDT-SWAP)
- **Cross Testnet (Blockchain)**: Native Token Betting & Automated Payouts via Backend.

## User Context
- **Betting**: Uses "**CROSS**" (Native Gas Token).
- **Network**: **Cross Testnet** (ID: 612044).
- **Wallet**: Users connect via **Reown AppKit (WalletConnect)**.
- **House Wallet**: Bets sent to `0x00837a0d1d51655ac5501e96bb53b898ae03c9c1`.
- **Payouts**: Automated via Backend API.

## Critical Memory
- `MainScene.ts` handles game loop, visual betting boxes, and triggers backend payout API.
- `UIOverlay.tsx` handles Wallet connection, Native Token Transactions, and Bet Selection (Dropdown).
- `gameStore.ts` manages state sync between Phaser and React.
