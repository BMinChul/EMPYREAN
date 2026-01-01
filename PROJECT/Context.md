# Context

## Project Overview
Crypto Arcade: Real-time ETH price betting game ("Euphoria" Style).
User bets on future price points using Blockchain Tokens (**tCROSS**).
Chart scrolls horizontally. Win if price line hits the betting box.

## Tech Stack
- React + Vite
- Phaser 3 (Game Engine)
- Zustand (State Management)
- WebSocket (OKX API for Data: ETH-USDT-SWAP)
- **Crossramp (Blockchain Layer)**: Asset management and Token swapping.

## User Context
- **Betting**: Uses "**tCROSS**" tokens.
- **Wallet**: Users connect via **Reown AppKit (WalletConnect)** on **Cross testnet** (ID: 612044).
- **Visuals**: "Euphoria" style (Deep Purple, Neon, Minimalist).

## Critical Memory
- `MainScene.ts` handles game loop and triggers bet/win actions via `gameStore`.
- `UIOverlay.tsx` acts as the bridge, listening to `gameStore` and calling `useAsset` (burn/mint).
- `.crossramp` file contains deployment UUID and asset keys.
