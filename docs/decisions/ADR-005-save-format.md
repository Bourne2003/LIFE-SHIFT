# ADR-005: Versioned saves in browser storage

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Milestone 3 needs save / load / new game for offline single-player. Saves will outlive the code
that wrote them: content gets renamed and removed, and the save shape will change. Online play
will later move persistence to a server.

## Decision

- **Format** (`packages/shared/src/save/save.ts`): `{ saveVersion, savedAt, state, player.tile }`.
  Only the `GameState` (flags, quest progress, NPC memories) and the player's tile are stored —
  anything content can rebuild (NPC positions, sign appearance) is derived on load.
- **Versioning:** `SAVE_VERSION` is bumped on any shape change, with a migration
  `SAVE_MIGRATIONS[n]: vN → vN+1`. Loading runs the chain; a save from a newer game version or
  with a missing migration is refused, never guessed at.
- **Never trust the save:** after migrating, `loadSave()` sanitises against the current content —
  unknown quests/NPCs, impossible quest progress, unsupported flag values and blocked positions
  are dropped with warnings. A corrupt or unreadable save starts a new game.
- **Storage:** one slot in `localStorage` behind an async `SaveStorage` interface
  (`apps/web/src/game/SaveService.ts`). Saves are a few KB; `localStorage` is synchronous, simple
  and available everywhere. Storage errors (private mode, quota) are reported in the UI, not
  thrown.
- **When:** autosave ~0.5 s after quest progress (bursts coalesced) and when the tab is hidden;
  manual Save in the menu. Load restores the slot; New game (confirmed) deletes it.

## Consequences

- Shared save code can validate saves server-side later.
- One slot only for now; multiple slots or cloud saves are a storage/UI change, not a format
  change.
- If saves grow (inventory, larger worlds) or need to be written off the main thread, swap
  `LocalSaveStorage` for an IndexedDB implementation of the same interface.

## Changelog

- **v2** (2026-10-01): added `money` and `inventory`. Migration 1→2 gives existing saves the
  starting money and items from `economy.json`. Migrations now receive the content, since
  sensible defaults usually come from it.
