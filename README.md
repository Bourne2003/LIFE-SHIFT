# LIFE SHIFT

> **Live your life. Change the world.**

A browser-first life simulation / RPG where NPCs live their own lives, remember you, and the
world changes in response to what you do. Runs on desktop, tablet and mobile browsers with no
install.

**Status:** Milestone 2 — _Playable City_ — in progress. See
[docs/GDD/vision.md](docs/GDD/vision.md) for the roadmap.

## Quick start

Requires Node.js 22.12+ (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
```

Controls: **WASD / arrow keys** on desktop, **E** or the on-screen **Interact** button to talk to a
nearby character; on touch screens, **drag on the left side** of the screen for a virtual joystick.
The city now has a living
morning/day/evening/night cycle and deterministic clear/rain weather, shown in the HUD. The
city includes data-driven buildings with real collision boundaries, ten NPCs, landmarks and
NPC-specific conversations. Completing the fountain quest unlocks a follow-up quest that relights
Lantern Park, making the first visible world-state change.
interface follows the browser language (English or Thai).
Use `?lang=th` / `?lang=en` to preview a language, or set `VITE_LOCALE` for a fixed deployment
default. The in-game language button saves the player's choice in the browser and takes precedence
over browser detection.

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
packages/game-data/ Localized, engine-agnostic NPC/dialogue/quest/item data foundation
docs/GDD/          Game design: vision, scope, milestones
docs/architecture/ How the code is organised
docs/decisions/    Architecture Decision Records (ADRs)
```

`apps/server`, `packages/protocol` and `packages/game-data` are planned and will be added in the
milestones that first need them.

If the Playwright-managed browser is unavailable locally but Google Chrome is installed, run
`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. CI continues to use the pinned Playwright browser.

## Configuration

Copy `.env.example` to `.env.local` at the repo root to override client settings. Only `VITE_`
variables reach the browser; never put secrets in them.
