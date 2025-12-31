# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- Visual: White line chart flowing left-to-right (infinite scrolling).
- **Grid System**: 
    - Screen divided into exactly 10 columns.
    - Left 5 columns (Past/Present): Clean, no multipliers.
    - Right 5 columns (Future): Display dynamic multipliers inside grid cells.
- **Interaction**: Click to place a solid Yellow Box.
    - Box snaps to grid cell center.
    - Box shows Bet Amount ($) and Multiplier (X).
- **Win Logic**: Head dot hits the box -> Win.
- **Feedback**: Small top-center notification bar for wins.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Clean white neon line. Head is a simple glowing dot. No crosshairs.
- **Background**: Deep purple/black. Neon grid lines.
- **HUD**: Glassmorphism panels.
- **Camera**: Head fixed at 50% screen width (Center). Chart scrolls past it.

## Known Issues
- Network latency might cause visual jumps (handled by spline smoothing).
