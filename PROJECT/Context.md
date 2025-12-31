# Context

## Project Overview
Crypto Arcade: Real-time ETH price betting game.
User bets on future price points. Chart scrolls horizontally.
Win if price line hits the betting box.

## Tech Stack
- React + Vite
- Phaser 3 (Game Engine)
- Zustand (State Management)
- WebSocket (OKX API for Data)

## User Context
User requested a game using real-time ETH data from OKX.
Key features: White line chart, Grid bg, Betting boxes with multipliers.

## Critical Memory
- `MainScene.ts` handles all game logic (rendering, input, collision).
- `okxService.ts` handles WebSocket connection.
- `gameStore.ts` syncs data between Phaser and React UI.
