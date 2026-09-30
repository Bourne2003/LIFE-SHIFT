# AGENTS.md — working on LIFE SHIFT

Guidance for AI coding agents (and humans) contributing to this repo.

## Before you change anything

1. Read `docs/GDD/vision.md` (scope, priorities, milestones) and `docs/architecture/overview.md`.
2. Check `docs/decisions/` before revisiting a settled choice; record new significant decisions
   as a new ADR.
3. Work on the current milestone. Do not build P2/P3 features while P0 work is open.

## Commands

```bash
npm install
npm run check      # format:check, lint, typecheck, unit tests, production build
npm run test:e2e   # Playwright; builds and serves the app itself
npx prettier --write .   # fix formatting
```

A change is done only when `npm run check` and `npm run test:e2e` pass. Never disable or skip a
test to get green; fix the cause.

## Architecture rules

- **Gameplay never reads input devices.** Devices implement `InputSource` and register with the
  `InputManager`; gameplay consumes a `MoveIntent`.
- **Pure logic goes in `packages/shared`** (no Phaser, no DOM) so the future server can run the
  same rules and so it can be unit tested in Node.
- **Shared per-game services** (input now; world state, save, network later) live in
  `GameServices` and are reached via `getServices(scene)`, not module globals.
- **Art is referenced by key** (`TextureKeys`), never by file path, so placeholders are swappable.
- **Content is data.** NPCs, dialogue, quests and items will be data files, not code.
- **Server authoritative** for anything that matters (money, items, quests, trades) once
  multiplayer exists. Never trust the client.
- No secrets in client code or in Git. Only `VITE_` env vars reach the browser.

## Git

- Small, logical commits: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`.
- Never commit `.env`, credentials, `node_modules` or build output.
