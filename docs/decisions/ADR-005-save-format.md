# ADR-005: Versioned local save of a single GameState

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

Milestone 3 needs save/load for offline single-player. Later milestones move authority over
progress to a server, so the saved data must be the same shape the server will own.

## Decision

- All persistent progress is one JSON-safe `GameState` (quests, world flags, NPC memory) plus
  the player's position. Nothing derived (text, sprites) is saved.
- Save file: `{ version, savedAt, state, player }`, `SAVE_VERSION = 1`. Older versions are
  upgraded by a chain of migrations; saves from a newer version are refused, not guessed at.
- Parsing (`parseSave`) never throws and drops individual invalid entries instead of rejecting
  the whole save. `reconcileState` then fits the state to current content (removed quests are
  dropped; an active quest whose step was removed restarts).
- One slot in `localStorage`, written automatically: on every state change, every 5 s while the
  player moves, and on `pagehide` / tab hidden. An unreadable save is moved to a backup key, not
  deleted.

## Consequences

- No manual save/load menu yet; a "new game" option comes with the pause menu.
- Saves live on one device and are editable by the player. Acceptable for offline single-player;
  online play will keep authoritative state on the server and treat local saves as untrusted.
