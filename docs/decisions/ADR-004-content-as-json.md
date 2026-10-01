# ADR-004: Game content as validated JSON

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

The map, NPCs, dialogue and quests must be data, not code, so they can grow without touching
gameplay systems and be edited by designers, tools and AI agents. The same content will be
needed by the future server.

## Decision

- Content lives in `packages/game-data/src` as JSON: `maps/town.json` (character rows +
  legend + named locations), `npcs.json`, `quests.json`, and one `dialogues/<npc>.json` per NPC.
- Its schema is the TypeScript types in `packages/shared/src/content/types.ts`.
- Because JSON imports are loosely typed, `validateContent()` checks what TypeScript cannot:
  every id reference, dialogue reachability, NPCs/spawn on walkable tiles, locations inside the
  map. It runs when the game loads (`loadContent()` throws listing every problem) and in unit
  tests, so broken content fails CI.
- Behaviour is expressed with a small closed vocabulary — conditions (`flag`, `quest`, `not`),
  effects (`setFlag`, `startQuest`), objectives (`talk`, `reach`) — extended in code only when
  content genuinely needs something new.

## Consequences

- Adding an NPC, line of dialogue or quest is a data change plus a passing test run.
- The map is editable as text; a visual editor (e.g. Tiled) can be adopted later by converting
  its export into the same `MapDef`.
- No schema library dependency for now; if the format grows, a runtime schema (e.g. Zod) may
  replace the hand-written structural checks.
