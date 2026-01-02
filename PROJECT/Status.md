# Status

## Active Work
- **UI Polish**: Dramatically increased icon sizes for Leaderboard and Guide buttons to ensure better visibility.
    - **Icon Size**: Increased `Trophy` and `HelpCircle` icon sizes to `36px` (from 28px).
    - **Mobile Optimization**: Maintained mobile scaling logic while ensuring icons are prominent within their buttons.

## Recent Activity
- **UI Fixes**: 
    - **Icon Visibility**: Updated `UIOverlay.tsx` to force `size={36}` on Leaderboard and Guide icons.
    - **Mobile Widgets**: Applied `scale-75 origin-top-left md:scale-100` to top-left container in `UIOverlay.tsx` (previously).
- **Responsive Design**: Implemented mobile-first responsive layout for `UIOverlay.tsx` while strictly preserving desktop layout.
- **New Feature**: Added "How to Play" Guide Modal accessed via a new Top Right button.

## Next Steps
- [ ] **Testing**: Verify visibility of larger icons (36px) on mobile and desktop.
- [ ] **Polishing**: Add more sound effects for Modal interactions.
- [ ] **Integration**: Monitor server response times for history fetching.
