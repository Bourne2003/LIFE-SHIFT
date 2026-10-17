# LIFE SHIFT

> **Live your life. Change the world.**

A browser-first life simulation / RPG where NPCs live their own lives, remember you, and the
world changes in response to what you do. Runs on desktop, tablet and mobile browsers with no
install.

**Status:** Milestone 3 — _World Memory_ — complete: finishing _Mina's Recipe_ opens a noodle
stall in the city, NPCs remember you, and progress is saved automatically on the device. The MVP
economy is in: earn baht from quests, shop at Aunt Daeng's store, and check your bag. Days pass
(one in-game day is 24 real minutes): nights are dark, the park lanterns light up, and some days it
rains — and people notice. Explore seven named places (one of them secret), meet 10 people and
finish 5 quests. See [docs/GDD/vision.md](docs/GDD/vision.md)
for the roadmap.

## Quick start

Requires Node.js 22.12+ (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
```

**Languages:** Thai (default) and English — switch with the **EN / ไทย** button at the top left,
or open the game with `?lang=en` / `?lang=th`. The choice is remembered on the device.

Controls: **WASD / arrow keys** to move and **E / Space / Enter** to talk on desktop (arrow keys
pick dialogue choices). On touch screens, **drag on the left side** of the screen for a virtual
joystick, tap **Talk** near someone, and tap the dialogue box or a choice to continue. **I** (or the
**Bag** button) opens your bag; in a shop, arrows + **E** confirm, **Tab** switches between buying
and selling, and **Esc** closes. **Esc** (or **Menu**) pauses; the pause menu can start a new game.

### Play on another device on your network

```bash
npm run dev:lan -w @life-shift/web   # prints http://192.168.x.x:5173
```

## Scripts

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Vite dev server with hot reload                                  |
| `npm run build`     | Production build to `apps/web/dist`                              |
| `npm run preview`   | Serve the production build                                       |
| `npm test`          | Unit tests (Vitest)                                              |
| `npm run test:e2e`  | Browser tests (Playwright; desktop + emulated phone)             |
| `npm run lint`      | ESLint                                                           |
| `npm run typecheck` | TypeScript across all workspaces                                 |
| `npm run check`     | Everything CI runs except e2e: format, lint, types, tests, build |

## Repository layout

```
apps/web/          Phaser 3 + Vite browser client
packages/shared/   Engine-agnostic types, constants and pure game logic (client + future server)
packages/game-data/ Content as data: NPCs, dialogue, quests
docs/GDD/          Game design: vision, scope, milestones
docs/architecture/ How the code is organised
docs/decisions/    Architecture Decision Records (ADRs)
```

`apps/server` and `packages/protocol` are planned and will be added in the
milestones that first need them.

## Configuration

Copy `.env.example` to `.env.local` at the repo root to override client settings. Only `VITE_`
variables reach the browser; never put secrets in them.
