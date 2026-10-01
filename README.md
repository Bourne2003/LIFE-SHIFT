# LIFE SHIFT

> **Live your life. Change the world.**

A browser-first life simulation / RPG where NPCs live their own lives, remember you, and the
world changes in response to what you do. Runs on desktop, tablet and mobile browsers with no
install.

**Status:** Milestone 3 — _World Memory_ — complete: explore Ban Suan, talk to 10 townspeople
who remember you, and change the town — reopen Somchai's Kitchen and watch the street react.
Progress saves automatically. See [docs/GDD/vision.md](docs/GDD/vision.md)
for the roadmap.

## Quick start

Requires Node.js 22.12+ (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
```

Controls:

- **Desktop:** WASD / arrow keys to move, **E** or **Space** to talk / continue, **1–4** to pick a
  dialogue choice, **Esc** to leave a conversation or close the menu.
- **Touch:** drag on the left side of the screen to move; tap **Talk**, tap the dialogue box to
  continue, tap a choice.
- **Menu (☰, top left):** save, load your last save, or start a new game. The game also saves
  automatically after quest progress and when you leave the tab.

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
packages/shared/   Content schema, game state and pure rules (client + future server)
packages/game-data/ Map, NPCs, dialogue and quests as JSON + validator (see docs/design/content.md)
docs/GDD/          Game design: vision, scope, milestones
docs/design/       How to write content
docs/architecture/ How the code is organised
docs/decisions/    Architecture Decision Records (ADRs)
```

`apps/server` and `packages/protocol` are planned and will be added in the
milestones that first need them.

## Configuration

Copy `.env.example` to `.env.local` at the repo root to override client settings. Only `VITE_`
variables reach the browser; never put secrets in them.
