# Architecture overview

## Workspaces

npm workspaces monorepo (see [ADR-002](../decisions/ADR-002-stack-and-monorepo.md)).

| Package              | Runs in        | Contains                                                                  |
| -------------------- | -------------- | ------------------------------------------------------------------------- |
| `apps/web`           | Browser        | Phaser scenes, entities, input devices, DOM UI, game session              |
| `packages/shared`    | Browser + Node | Content schema, game state, rules (quests, dialogue, map). No Phaser/DOM. |
| `packages/game-data` | Browser + Node | Content as JSON (map, NPCs, dialogue, quests) + `validateContent()`       |
| `apps/server`        | Node (planned) | Authoritative multiplayer server — milestone 4                            |
| `packages/protocol`  | Both (planned) | Client/server message schemas — milestone 4                               |

Rule: browser code may import `shared`, `protocol`, `game-data`; it must never import
`apps/server`. Internal packages export TypeScript source directly (no build step).

## Layers

```
game-data (JSON content) ──► shared (pure rules) ──► web: GameSession / DialogueController
                                                       │            ▲
                                    WorldScene (Phaser)┘            │ events
                                    DOM UI (mountUi) ───────────────┘
```

- **Content** ([ADR-004](../decisions/ADR-004-content-as-json.md)) describes _what exists_: map,
  NPCs, dialogue graphs, quests. Validated at load and in unit tests.
- **Rules** in `shared` are pure functions over immutable `GameState`: conditions, effects, the
  quest engine, the dialogue runner, tile solidity. The future server runs the same code.
- **GameSession** owns the `GameState` and is the only thing that changes it. Callers request
  changes (`applyEffects`, `questEvent`) and observe `state` / `notice` events — the same
  request → validate → broadcast shape a server-authoritative session will have.
- **Phaser** draws the world and runs physics. **The DOM UI** draws text and buttons
  ([ADR-003](../decisions/ADR-003-dom-ui-overlay.md)).

## Client (`apps/web/src`)

```
main.ts                 load content → services → Phaser game → DOM UI (+ debug API in dev)
config.ts               VITE_ env → typed ClientConfig
game/
  services.ts           GameServices: content, input, session, dialogue, world events
  GameSession.ts        owns GameState; applies effects and quest events; emits notices
  DialogueController.ts one conversation at a time; produces a DialogueView for the UI
  events.ts             tiny typed emitter (Phaser-free, unit-testable)
  createGame.ts         Phaser.Game config (RESIZE scale mode, arcade physics, scenes)
  resize.ts             ResizeObserver workaround for a Phaser rotation bug
  viewport.ts           camera zoom for any screen size
  assets.ts             TextureKeys — the only way gameplay refers to art
  debug.ts              window.__LIFE_SHIFT__ snapshot + teleport for e2e tests (dev only)
art/placeholderArt.ts   programmer art drawn at boot (tileset, characters); replaceable
scenes/
  BootScene             generates placeholder textures
  WorldScene            tilemap + collision, player, NPCs, interaction target, location
                        tracking (→ `reach` quest events), dialogue mode
  UIScene               touch joystick (needs canvas input; everything else is DOM)
world/TownMap.ts        MapDef → Phaser tilemap layer with collision on solid tiles
entities/               Player (feet body, intent → velocity), Npc (static feet body)
input/                  InputSource + InputManager (move intent + actions), keyboard, joystick
ui/mountUi.ts           hint, quest tracker, toasts, Talk button, dialogue box (DOM)
```

### Input

```
Keyboard ─┬─ move ─► InputManager.getMoveIntent() ─► Player.applyIntent()
Joystick ─┘
E / Space / Talk button / tap on dialogue ─► InputManager.press('interact')
Esc ─► press('cancel')                       └► WorldScene.update(): consume() once per frame
```

Actions not consumed in a frame are dropped (`endFrame()`), so a stray tap can never fire later.

### Interaction and quests

Each frame `WorldScene` picks the nearest NPC within `INTERACT_RANGE` (shared) and reports
changes as `interactTarget`. Interacting starts a dialogue: the NPC's first dialogue whose
conditions hold is chosen, then a `talk` quest event is sent, then node effects are applied.
When the player's tile changes, every location containing it is sent as a `reach` quest event
(also re-sent after quest changes, so a quest started inside its target area still completes).

### Scenes and scaling

The canvas always fills its container (`Scale.RESIZE`). The world camera zoom is recomputed on
resize so roughly 12 tiles fit on the short screen edge. DOM UI uses CSS for layout, safe-area
insets and pointer-type-specific hints.

## Testing

- **Unit (Vitest, Node):** everything pure — `packages/*/test`, `apps/web/src/**/*.test.ts`
  (including a full quest playthrough through `DialogueController`). Test files must not import
  Phaser.
- **Content:** the shipped JSON is validated in `packages/game-data/test`.
- **Browser (Playwright):** `apps/web/e2e`, desktop Chrome and emulated Pixel 7: movement,
  collision with buildings/NPCs/edges, prompts, dialogue, the full quest by keyboard, touch
  controls and tap-target sizes, console-error-free dev and production boots.
