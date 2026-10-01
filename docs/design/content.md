# Writing content

All content is in `packages/game-data/src`. After any change run `npm test` — the content
validator reports broken references, unreachable dialogue and badly placed NPCs.

## Map — `maps/town.json`

`rows` is the map, one character per 32px tile; `legend` maps characters to tile kinds
(`TILE_KINDS` in `packages/shared/src/world/map.ts` decides which are solid). Coordinates are
tile `x` (column) and `y` (row), starting at 0 in the top-left.

`locations` are named rectangles used for area announcements and `reach` objectives. Overlaps
are fine; the smallest containing area is announced. `hidden: true` announces it as a discovery.

## NPCs — `npcs.json`

```json
{
  "id": "ken",
  "name": "Ken",
  "occupation": "Shopkeeper",
  "personality": ["practical"],
  "color": "#4f8fd9",
  "position": { "x": 36, "y": 11 },
  "schedule": [{ "period": "any", "position": { "x": 36, "y": 11 } }],
  "dialogues": [
    {
      "dialogue": "ken_quest",
      "when": [
        { "type": "quest", "quest": "q_know_town", "status": "active", "objective": "talk_ken" }
      ]
    },
    { "dialogue": "ken_default" }
  ],
  "relationships": { "noi": "family" },
  "quests": ["q_know_town"]
}
```

`dialogues` is checked top to bottom; the first entry whose `when` conditions all hold is used,
so put specific dialogues first and an unconditional default last. `schedule` is stored now and
will drive positions once the game clock exists.

## Dialogue — `dialogues/<npc>.json`

```json
{
  "id": "noi_intro",
  "start": "greet",
  "nodes": {
    "greet": { "text": "Welcome!", "next": "offer" },
    "offer": {
      "text": "Will you help?",
      "choices": [
        {
          "text": "Yes",
          "next": "yes",
          "effects": [{ "type": "startQuest", "quest": "q_know_town" }]
        },
        { "text": "Secret option", "when": [{ "type": "flag", "flag": "vip" }] },
        { "text": "No" }
      ]
    },
    "yes": { "speaker": "player", "text": "On my way." }
  }
}
```

- A node has either `next` or `choices`; omitting both ends the conversation. A choice without
  `next` also ends it.
- `speaker` defaults to the NPC being talked to; use another NPC id or `player`.
- `effects` on a node apply when it is shown; on a choice, when it is picked.

## Quests — `quests.json`

Objectives are completed in order. Types: `talk` (`npc`) — completes when a conversation with
that NPC starts; `reach` (`location`) — completes when the player stands in that location.
`rewards` are effects applied on completion; `next` starts a follow-up quest.

## Conditions and effects

| Condition                                               | True when                                       |
| ------------------------------------------------------- | ----------------------------------------------- |
| `{ "type": "flag", "flag": "f" }`                       | flag `f` is `true` (or `equals` value)          |
| `{ "type": "quest", "quest": "q", "status": "active" }` | status is `not_started/active/completed/failed` |
| `{ "type": "quest", ..., "objective": "o" }`            | …and `o` is the current objective               |
| `{ "type": "not", "condition": { ... } }`               | inner condition is false                        |

| Effect                                           | Does                                      |
| ------------------------------------------------ | ----------------------------------------- |
| `{ "type": "setFlag", "flag": "f", "value": 3 }` | sets a world flag (default `true`)        |
| `{ "type": "startQuest", "quest": "q" }`         | starts a quest (no-op if already started) |
