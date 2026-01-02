# Status

## Active Work
- **Bug Fix**: Fixed wallet balance display issue where "WALLET BALANCE" showed 0.00 despite having funds.
    - Updated `UIOverlay.tsx` to explicitly pass `chainId: crossTestnet.id` to `useBalance`.
    - Added `refetchInterval` (5s) and `retry: true` to ensure balance stays synced.
    - Added automatic refetch trigger when wallet address changes.

## Recent Activity
- **Preview Stability Fix**:
    - **Offline Fallback**: Modified `MainScene.placeBet` to catch network errors.
    - **Simulation Mode**: Fallback to local logic if backend is unreachable.
    - **Error Handling**: Downgraded console errors to warnings for preview environment.
- **UI Refinements**:
    - **Pending Box**: Centered multiplier text.
    - **Confirmed Box**: Updated text to `$ {amount} Cross`.

## Next Steps
- [ ] **Testing**: Verify wallet balance updates correctly on Cross Testnet.
- [ ] **Testing**: Verify full betting flow with actual tCROSS tokens.
- [ ] **Cleanup**: Remove temporary debugging logs if any.
- [ ] **Wallet**: Monitor specific wallet (Leap/Metamask) compatibility.
