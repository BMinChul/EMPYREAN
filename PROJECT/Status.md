# Status

## Active Work
- **Console Error Fixes**:
    - **Stack Overflow**: Removed `injected()` connector from `wagmi.ts` to fix conflict with Leap Wallet extension (`injectLeap.js`).
    - **Auth Conflict**: Removed `useBalance` from `UIOverlay.tsx` to stop fighting between Wagmi and Privy providers. Now relying on `useAsset` for balance.
- **Privy Initialization**:
    - **Status**: App ID configured (`cmjusbsry00z5l40c7kd3t0zq`).
    - **Improvements**: Added detailed error message in `LoginModal.tsx` guiding users to check "Allowed Domains".

## Recent Activity
- **Bug Fix**: Resolved `RangeError: Maximum call stack size exceeded` by removing aggressive wallet injection probing.
- **Optimization**: Simplified balance fetching to use `useGameStore` / `useAsset` exclusively.
- **Configuration Update**:
    - Confirmed `VITE_PRIVY_APP_ID` in `.env`.
    - Updated `LoginModal` to detect timeout.

## Next Steps
- [ ] **Action Required**: Go to [Privy Dashboard](https://dashboard.privy.io) -> Settings -> Basics -> Allowed Domains.
- [ ] **Action Required**: Add the current domain (e.g., `https://agent8-games.verse8.io` or `*`) to the list.
- [ ] **Verify Initialization**: Restart the dev server and open the app.
- [ ] **Test Login**: Click "Connect Wallet" and verify the modal appears without errors.
