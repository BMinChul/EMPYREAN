# Structure

## File Structure
- `src/`
  - `game/`
    - `scenes/MainScene.ts`: Main game logic.
      - `restoreBets()`: Re-creates visual boxes from server state.
      - `placeBet()`: Calculates expiry based on Column 4 deadline.
    - `Game.ts`: Phaser config.
  - `components/`
    - `GameComponent.tsx`: Phaser container.
    - `UIOverlay.tsx`: React HUD.
  - `services/`
    - `okxService.ts`: WebSocket handler.
  - `store/`
    - `gameStore.ts`: Zustand store.
      - `fetchActiveBets()`: Retrieves persistence data.
  - `App.tsx`: Main entry.

## Architecture
- **Phaser**: Handles rendering (Canvas), Input, Physics/Collision.
- **React**: Handles HUD (Text overlay).
- **Zustand**: Bridge between Phaser (updates data) and React (consumes data).
