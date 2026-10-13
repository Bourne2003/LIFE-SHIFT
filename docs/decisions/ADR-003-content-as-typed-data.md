# ADR-003: Game content as typed TypeScript data

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

Milestone 2 introduces the first content: NPCs, dialogue and a quest. The vision requires content
to be data, not code, so it can grow to ~10 NPCs and ~5 quests (and later be edited, saved and
served) without touching gameplay logic.

## Decision

- Content lives in `packages/game-data` as plain TypeScript objects typed by interfaces from
  `packages/shared` (`NpcDef`, `DialogueDef`, `QuestDef`). The package contains no logic.
- All rules that interpret content (dialogue selection by quest condition, dialogue traversal,
  quest step progression) are pure functions in `packages/shared`, so a future server runs the
  same rules.
- `validateContent()` checks cross-references (dialogue ids, nodes, quests, steps, unique ids);
  a unit test runs it over the real content, plus a playthrough test of each quest.
- Dialogue changes game state only through declared effects (`startQuest`, `completeStep`);
  quest progress is a serialisable `QuestLog`.

## Alternatives

- **JSON files:** easy for external tools, but no compile-time typing; the same validator would
  be needed anyway. Revisit when a content editor or server-delivered content exists — the shapes
  are already JSON-compatible.
- **Scripted dialogue (Ink, Yarn):** powerful, but a new dependency and language before we know we
  need branching beyond choices and conditions.

## Consequences

- Typos in references fail `npm test`, not at runtime.
- Effects/conditions are a small closed set; new kinds (items, flags, world state) are added to
  the union in `shared` with their rules and validation.
