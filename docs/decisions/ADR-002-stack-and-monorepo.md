# ADR-002: Initial stack and monorepo layout

- **Status:** Accepted
- **Date:** 2026-09-30

## Decision

| Concern       | Choice                                  | Why                                                                                                                |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Language      | TypeScript 6.0 (strict)                 | Shared types client/server. 6.0 not 7.x: typescript-eslint supports `<6.1`.                                        |
| Engine        | Phaser **3.90.0** (pinned)              | Specified by the project brief; mature, large ecosystem. Phaser 4 exists — evaluate separately, not mid-prototype. |
| Bundler       | Vite 8                                  | Fast dev server, simple static production build.                                                                   |
| Unit tests    | Vitest 5                                | Shares Vite's transform pipeline; runs pure logic in Node.                                                         |
| Browser tests | Playwright **1.56.1** (pinned)          | Real Chromium incl. touch emulation. Pinned to the Chromium build available in the dev container.                  |
| Lint/format   | ESLint 10 + typescript-eslint, Prettier | Standard, low-config.                                                                                              |
| Repo          | npm workspaces                          | No extra tooling; enough for a handful of packages.                                                                |
| Multiplayer   | Deferred (Colyseus is the candidate)    | Decided in milestone 4 with its own ADR.                                                                           |

Internal packages export `.ts` source directly (`"exports": "./src/index.ts"`) rather than being
built, keeping the dev loop instant. Revisit if the server needs pre-built output.

## Consequences

- Production bundle is ~1.2 MB / ~320 KB gzip, almost all Phaser. Acceptable for now; revisit
  if load time on mobile becomes a problem.
- Phaser 3.90 has a RESIZE-mode orientation bug (see `apps/web/src/game/resize.ts`); re-check
  when upgrading Phaser.
