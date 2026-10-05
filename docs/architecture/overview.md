# Architecture overview

## Workspaces

npm workspaces monorepo (see [ADR-002](../decisions/ADR-002-stack-and-monorepo.md)).

| Package              | Runs in        | Contains                                                         |
| -------------------- | -------------- | ---------------------------------------------------------------- |
| `apps/web`           | Browser        | Phaser scenes, entities, input devices, UI                       |
| `packages/shared`    | Browser + Node | Types, constants, pure rules (movement math). No Phaser, no DOM. |
| `apps/server`        | Node (planned) | Authoritative multiplayer server — milestone 4                   |
| `packages/protocol`  | Both (planned) | Client/server message schemas — milestone 4                      |
| `packages/game-data` | Both (planned) | NPC, dialogue, quest and item data — milestone 2                 |

Rule: browser code may import `shared`, `protocol`, `game-data`; it must never import
`apps/server`. Internal packages export TypeScript source directly (no build step).

## Client (`apps/web/src`)

```
main.ts                 entry: creates the game; installs the debug API in dev builds only
config.ts               VITE_ env → typed ClientConfig
game/
  createGame.ts         Phaser.Game config (RESIZE scale mode, arcade physics, scene list)
  services.ts           GameServices container, stored in the game registry
  resize.ts             ResizeObserver workaround for a Phaser rotation bug
  viewport.ts           camera zoom for any screen size (pure, unit tested)
  worldClock.ts         deterministic day-period and weather state (pure, unit tested)
  assets.ts             TextureKeys — the only way gameplay refers to art
  sceneKeys.ts
  debug.ts              window.__LIFE_SHIFT__ read-only snapshot for e2e tests (dev only)
scenes/
  BootScene             prepares (currently generates) placeholder textures
  WorldScene            world, data-driven city structures/collision, NPC/landmark interaction, quest progression and world-state changes, physics bounds, player, camera follow + zoom
  UIScene               screen-space overlay: touch joystick, hints, objective and environment HUD
entities/Player.ts      physics body at the feet; turns a MoveIntent into velocity/facing/state
content                 localized city structures, NPCs, landmarks and chained quests from `packages/game-data`; the current slice contains ten NPCs and four landmarks
input/
  InputSource.ts        interface: getMoveIntent()
  ActionInputSource.ts  interface for one-shot interactions
  InputManager.ts       merges all sources into one intent
  KeyboardInputSource   WASD + arrows
  KeyboardActionInputSource  E for nearby NPC interaction
  TouchJoystick         floating joystick on the left 60% of the screen (touch pointers only)
  joystickMath.ts       deadzone/ramp maths (pure, unit tested)
```

### Input flow

```
Keyboard ─┐
Joystick ─┼─► InputManager.getMoveIntent() ─► Player.applyIntent() ─► arcade body velocity
(gamepad) ┘        (combine + clamp)             (shared movement rules)
```

Adding a device = implementing `InputSource` or `ActionInputSource` and registering it. Gameplay
never reads raw input devices.

### Scenes and scaling

The canvas always fills its container (`Scale.RESIZE`). Instead of letterboxing, the world
camera zoom is recomputed on resize so roughly 12 tiles fit on the short screen edge (quarter-step
zoom, 1×–3×, never showing past the world edge). UI lives in its own scene with an unzoomed camera
so controls keep a constant physical size.

## Testing

- **Unit (Vitest, Node):** everything pure — `packages/shared/test`, `apps/web/src/**/*.test.ts`.
  Test files must not import Phaser.
- **Browser (Playwright):** `apps/web/e2e`, desktop Chrome and emulated Pixel 7. Gameplay tests
  read state through the dev-only debug API; one test boots the production build and fails on any
  console error.
