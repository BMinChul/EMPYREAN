# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- Visual: White line chart flowing left-to-right (infinite scrolling).
- **Grid System (10-Column)**: 
    - Screen divided into exactly 10 columns.
    - **Left 5 Columns**: Clear space, faint grid lines, NO multipliers.
    - **Right 5 Columns**: Betting Zone. Gradient fade-in from 50% width. Multipliers centered in cells.
- **Interaction**: Click to place a solid Pale Yellow Box.
    - Box snaps to grid cell center.
    - Box shows Bet Amount ($) and Multiplier (X).
- **Win Logic**: Head dot hits the box -> Win.
- **Feedback**: Floating win amount text above cell. Top-center notification bar.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Clean white neon line. Head is a simple glowing dot. **NO CROSSHAIRS**.
- **Background**: Deep Magenta/Purple (`#1a0b2e`). Neon grid lines.
- **Bet Box**: Pale Yellow (`#fffacd`), Rounded Corners, 70% White Border, Black Text, NO GLOW.
- **Price Axis**: Right side, $0.5 increments. Moving "Current Price" tag.

## Camera & Time
- **Head Position**: Fixed at **25%** screen width and **50%** screen height.
- **Scroll**: 40-second window.

## Known Issues
- Network latency might cause visual jumps (handled by spline smoothing).
