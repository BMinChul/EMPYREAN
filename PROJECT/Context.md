# Context

## Project Overview
Crypto Arcade: Real-time ETH price betting game ("Euphoria" Style).
User bets on future price points. Chart scrolls horizontally.
Win if price line hits the betting box.

## Tech Stack
- React + Vite
- Phaser 3 (Game Engine)
- Zustand (State Management)
- WebSocket (OKX API for Data: ETH-USDT-SWAP)

## User Context
User requested a specific "Euphoria" look:
- 10-column grid.
- Center-locked camera.
- Minimalist betting boxes (Yellow, no glow).
- Clean white line chart.

## Critical Memory
- `MainScene.ts` handles all game logic (rendering, input, collision, 10-col grid).
- `okxService.ts` handles WebSocket connection (ETH-USDT-SWAP).
- `gameStore.ts` syncs data between Phaser and React UI.
