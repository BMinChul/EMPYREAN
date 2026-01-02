# Status

## Active Work
- **Responsive Design**: Implemented mobile-first responsive layout for `UIOverlay.tsx` while strictly preserving desktop layout.
    - **Mobile**: Top widgets stack vertically, bottom bar takes full width. Fonts and padding scaled down.
    - **Desktop**: Preserved side-by-side widget layout and bottom-left positioning.
- **New Feature**: Added "How to Play" Guide Modal accessed via a new Top Right button (?) with responsive sizing.

## Recent Activity
- **UI Refactor**: Converted `UIOverlay.tsx` to use responsive Tailwind classes (`md:` prefix) for seamless mobile/desktop adaptation.
- **Audio Improvements**: 
    - Replaced "Cyberpunk" BGM with "High Tension Electronic" track for better betting atmosphere.
    - **Fixed BGM Stutter**: Disabled `pauseOnBlur` in `MainScene.ts` so music continues playing during Wallet Popups and Transaction Confirmations.
- **Backend Sync**: Added `registerServerBet` call with `txHash` immediately after transaction broadcast in `UIOverlay.tsx`.
- **UI Fix**: Enhanced History Item styling with Gold/Black theme for "WON" bets and Orange text for "REFUNDED" status.

## Next Steps
- [ ] **Testing**: Verify responsive behavior on various screen sizes (simulated mobile/desktop).
- [ ] **Polishing**: Add more sound effects for Modal interactions.
- [ ] **Integration**: Monitor server response times for history fetching.
