# Architecture overview

## Workspaces

npm workspaces monorepo (see [ADR-002](../decisions/ADR-002-stack-and-monorepo.md)).

| Package              | Runs in        | Contains                                                         |
| -------------------- | -------------- | ---------------------------------------------------------------- |
| `apps/web`           | Browser        | Phaser scenes, entities, input devices, UI                       |
| `packages/shared`    | Browser + Node | Types, pure rules (movement, game state, dialogue, save format). |
| `apps/server`        | Node (planned) | Authoritative multiplayer server — milestone 4                   |
| `packages/protocol`  | Both (planned) | Client/server message schemas — milestone 4                      |
| `packages/game-data` | Browser + Node | NPCs, dialogue, quests, world props (items later). Data only.    |

Rule: browser code may import `shared`, `protocol`, `game-data`; it must never import
`apps/server`. Internal packages export TypeScript source directly (no build step).

## Client (`apps/web/src`)

```
main.ts                 entry: creates the game; installs the debug API in dev builds only
config.ts               VITE_ env → typed ClientConfig
game/
  createGame.ts         Phaser.Game config (RESIZE scale mode, arcade physics, scene list)
  services.ts           GameServices container (input, session), stored in the game registry
  session.ts            GameSession: GameState, NPC in reach, open conversation (no Phaser)
  SaveService.ts        single save slot in localStorage; unreadable saves are set aside
  autosave.ts           saves on state change, every 5 s while moving, and on page hide
  resize.ts             ResizeObserver workaround for a Phaser rotation bug
  viewport.ts           camera zoom for any screen size (pure, unit tested)
  assets.ts             TextureKeys — the only way gameplay refers to art
  sceneKeys.ts
  debug.ts              window.__LIFE_SHIFT__ snapshots + teleport hook for e2e tests (dev only)
scenes/
  BootScene             prepares (currently generates) placeholder textures
  WorldScene            world, obstacles, NPCs, player, camera; feeds actions to the session
  UIScene               screen-space overlay: joystick, Talk button, prompt, dialogue, quest HUD
ui/DialogueBox.ts       conversation panel (view only; reports taps via callbacks)
ui/wrapText.ts          language-aware line wrapping (Thai has no spaces between words)
ui/style.ts             shared text style (bundled Noto Sans Thai) + setSmartWrap()
i18n/
  strings.ts            every UI string, typed Record<Locale, UiStrings>
  LocaleService.ts      current language, change events, content-text lookup
  browser.ts            ?lang= / saved choice / <html lang> wiring
entities/Player.ts      physics body at the feet; turns a MoveIntent into velocity/facing/state
input/
  InputSource.ts        interface: getMoveIntent(), optional consumeActions()
  InputManager.ts       merges all sources into one intent and one set of actions
  KeyboardInputSource   WASD + arrows; E/Space/Enter interact
  TouchActionButton     on-screen Talk button (touch devices)
  TouchJoystick         floating joystick on the left 60% of the screen (touch pointers only)
  joystickMath.ts       deadzone/ramp maths (pure, unit tested)
```

### Input flow

```
Keyboard ─┐
Joystick ─┼─► InputManager.getMoveIntent() ─► Player.applyIntent() ─► arcade body velocity
(gamepad) ┘        (combine + clamp)             (shared movement rules)
```

Adding a device = implementing `InputSource` and registering it. Gameplay never changes.

Discrete presses (`interact`, `navUp`, `navDown`) travel the same way: each source queues them and
`InputManager.consumeActions()` drains every source once per frame. Sources queue presses from
key-down events rather than polling, so a tap shorter than one frame is never lost.

### Story flow (interaction, dialogue, quests)

```
WorldScene ──nearest NPC in range──► GameSession ◄──taps── UIScene (DialogueBox, Talk button)
           ──interact / nav actions──►    │  uses shared rules: selectNpcDialogue,
                                          │  beginDialogue / advanceDialogue, quest steps
                                          └──events (changed, questStarted/Completed)──► UIScene
```

All persistent progress is one plain `GameState` (`packages/shared/src/state`): the quest log,
world **flags** and per-NPC **memory** (how often you talked). Content tests it with conditions
(`{ quest, status }`, `{ flag }`, `{ npc, met }`) and changes it with effects (`startQuest`,
`completeStep`, `setFlag`). A quest's `onComplete` effects are its consequence for the world, e.g.
Mina's Recipe sets `somchai-stall-open`, which shows the noodle-stall **world prop** and changes
what several NPCs say. Saves are versioned (see
[ADR-005](../decisions/ADR-005-save-format.md)).

Content lives in `packages/game-data` (see [ADR-003](../decisions/ADR-003-content-as-typed-data.md)).
An NPC lists dialogue options guarded by conditions (first match wins); dialogue nodes and
choices carry effects. While a conversation is open the player does not move.

### Scenes and scaling

The canvas always fills its container (`Scale.RESIZE`). Instead of letterboxing, the world
camera zoom is recomputed on resize so roughly 12 tiles fit on the short screen edge (quarter-step
zoom, 1×–3×, never showing past the world edge). UI lives in its own scene with an unzoomed camera
so controls keep a constant physical size.

### Languages (i18n)

Thai is the primary language, English the second (see
[ADR-004](../decisions/ADR-004-thai-first-i18n.md)). Content text is `LocalizedText`
(`{ th, en }`) and `validateContent()` fails on any missing translation; UI strings are a typed
`Record<Locale, UiStrings>`, so a missing one is a compile error. Story state never contains
resolved strings: `GameSession` returns `LocalizedText` and the UI resolves it through
`LocaleService`, so switching language re-renders without touching game state.

## Testing

- **Unit (Vitest, Node):** everything pure — `packages/shared/test`, `apps/web/src/**/*.test.ts`.
  Test files must not import Phaser.
- **Browser (Playwright):** `apps/web/e2e`, desktop Chrome and emulated Pixel 7. Gameplay tests
  read state through the dev-only debug API (and position the player with its `teleport` hook,
  since headless frame rates make keyboard positioning imprecise); one test boots the production build and fails on any
  console error.
