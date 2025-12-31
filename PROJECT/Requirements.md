# Requirements

## Core Gameplay
- Real-time ETH/USDT Perpetual Futures feed (OKX WebSocket).
- Visual: White/Light Purple line chart flowing left-to-right.
- **Grid System (10-Column)**: 
    - Screen divided into exactly 10 columns.
    - **Left 5 Columns**: Clear space, faint grid lines, NO multipliers.
    - **Right 5 Columns**: Betting Zone. Gradient fade-in. Multipliers centered.
- **Multiplier Logic (Strict Math)**:
    - **Formula**: `M(x, t) = (1 / P(x, t)) * (1 - House Edge)`
    - **P(x,t)**: Normal Distribution PDF (Diffusion Equation).
    - **Behavior**:
        - Center ($x=0$): Multiplier INCREASES over time ($t$).
        - Edge ($x>>0$): Multiplier DECREASES over time ($t$).
    - **House Edge**: 5% deduction from fair odds.
- **Interaction**: Click to place a solid Pale Yellow Box.
    - Box snaps to grid cell center.
    - Box shows Bet Amount ($) and Multiplier (X).
- **Win Logic**: Head dot hits the box -> Win.
- **Feedback**: Floating win amount text. Top-center notification.

## Visual Aesthetics ("Euphoria" Style)
- **Chart**: Thick (**40px**) Light Purple (`0xE0B0FF`) line.
- **Bloom**: Applied ONLY to Chart and Grid. Betting Boxes and Text remain crisp.
- **Background**: Deep Magenta/Purple (`#1a0b2e`). Neon grid lines.
- **Betting Box**: 
    - **Idle**: Solid Pale Yellow (`#fffacd`), Rounded Corners, Black Bold Text (`$10`), NO GLOW.
    - **Proximity**: When Graph Head approaches (<250px), a "Spread Glow" fades in around the box.
- **Text**: Always Black, Bold, and on top of the box.

## Camera & Time
- **Head Position**: Fixed at **25%** screen width and **50%** screen height.
- **Scroll**: 100-second window (variable based on screen width).

## Known Issues
- Network latency might cause visual jumps (handled by spline smoothing).
