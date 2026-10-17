# ADR-006: Public playtest build on GitHub Pages

- **Status:** Accepted (requested by the project owner)
- **Date:** 2026-10-17

## Context

The owner wants the game playable online by testers without installing anything. The game is
still single-player and fully client-side: content, rules and saves all run in the browser.

## Decision

- Publish the production build to **GitHub Pages** at `https://bourne2003.github.io/LIFE-SHIFT/`
  with `.github/workflows/deploy.yml` on every push to `main` (and on manual dispatch).
- The deploy job runs `npm run check` (format, lint, types, unit tests, build) first, so a broken
  game is never published; browser tests run in the CI workflow on the same commit.
- The build uses relative asset URLs (`base: './'`), so it works from the repository sub-path.
- The commit SHA is baked in as `VITE_APP_VERSION` and shown in the pause menu for bug reports.
- One-time repository setting: **Settings → Pages → Source: GitHub Actions**.

## Consequences

- GitHub Pages serves static files only. It cannot host the multiplayer game server (milestones
  4–5); that will need a separate host (its own ADR), with this site as the client.
- Saves are per browser (localStorage). All of the owner's `*.github.io` pages share one origin,
  so the save key is namespaced (`life-shift.*`).
- No secrets are involved: only public `VITE_` values are built into the client.
