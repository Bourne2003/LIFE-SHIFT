# LIFE SHIFT

> **Live your life. Change the world.**

A browser-first life simulation / RPG where NPCs live their own lives, remember you, and the
world changes in response to what you do. Runs on desktop, tablet and mobile browsers with no
install.

**Status:** Milestone 1 — _Browser Game Bootstrap_ — complete. See [docs/GDD/vision.md](docs/GDD/vision.md)
for the roadmap.

## Quick start

Requires Node.js 22.12+ (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
```

Controls: **WASD / arrow keys** on desktop; on touch screens, **drag on the left side** of the
screen for a virtual joystick.

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
docs/GDD/          Game design: vision, scope, milestones
docs/architecture/ How the code is organised
docs/decisions/    Architecture Decision Records (ADRs)
```

`apps/server`, `packages/protocol` and `packages/game-data` are planned and will be added in the
milestones that first need them.

## Configuration

Copy `.env.example` to `.env.local` at the repo root to override client settings. Only `VITE_`
variables reach the browser; never put secrets in them.
