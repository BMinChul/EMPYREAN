# Requirements

## Core Gameplay
- Real-time ETH/USDT price feed (OKX WebSocket).
- Visual: White line chart flowing left-to-right (scrolling).
- Interaction: Click to place $1 bet box.
- Logic: Box has multiplier based on distance from current price.
- Win: Price line hits box -> Reward = Bet * Multiplier.
- Loss: Price line passes box without hitting -> Loss $1.

## UI/UX
- HUD: Real-time Price, User Balance.
- Visuals: Dark grid, Neon/Yellow boxes.

## Known Issues
- Network latency might cause visual jumps (handled by connecting dots).
- Initial price loading time needs "Waiting..." text (Implemented).
