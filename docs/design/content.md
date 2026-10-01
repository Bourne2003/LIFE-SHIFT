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
so put specific dialogues first and an unconditional default last.

`schedule` decides where the NPC stands: the first entry whose `period` matches (`any` until the
game clock exists) and whose `when` conditions hold, else `position`. Use it for consequences:

```json
"schedule": [
  { "period": "any", "position": { "x": 26, "y": 22 }, "when": [{ "type": "flag", "flag": "restaurant_open" }] },
  { "period": "any", "position": { "x": 27, "y": 23 } }
]
```

NPCs automatically remember `PLAYER_MET_NPC` the first time you talk to them; quest givers
remember `PLAYER_COMPLETED_QUEST` / `PLAYER_FAILED_QUEST`.

## Objects — `objects.json`

Inspectable things that are not people (signs, notice boards). `appearances` and `dialogues`
are chosen like NPC dialogues — first match wins — so world state changes how they look and
what they say. Each `texture` needs art in the client (placeholders live in
`apps/web/src/art/placeholderArt.ts`).

## Items, shops and money — `items.json`, `shops.json`, `economy.json`

```json
{
  "id": "mango",
  "name": "Mango",
  "description": "Sweet.",
  "category": "food",
  "maxStack": 10,
  "price": 12,
  "sellable": true
}
```

- `category`: `food`, `ingredient`, `quest` or `misc`. Quest items can't be sold or bought and
  never count against the 20-slot bag, so a quest can't be blocked by a full bag.
- `price` is in whole currency units. A shop can override it per stock entry.

```json
{
  "id": "mali_stall",
  "name": "Mali's Fruit Stall",
  "owner": "mali",
  "stock": [{ "item": "apple" }, { "item": "mango", "price": 10 }],
  "buys": ["food"],
  "buybackRate": 0.5,
  "when": [{ "type": "flag", "flag": "market_open" }]
}
```

- Shops open from dialogue: give the owner a choice with `{ "type": "openShop", "shop": "mali_stall" }`.
  The validator fails if no dialogue opens a shop.
- The shop pays `floor(price × buybackRate)` for items in a category it `buys`.
- `when` closes the shop unless every condition holds (Somchai's kitchen needs `restaurant_open`).

`economy.json` sets the currency symbol, starting money and starting items for a new game.

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
that NPC starts; `reach` (`location`) — completes when the player stands in that location;
`deliver` (`npc`, `item`, optional `quantity`) — completes when talking to the NPC while
carrying the items, which are handed over.
`rewards` are effects applied on completion; `next` starts a follow-up quest. A `failQuest`
effect fails an active quest; starting a failed quest again restarts it from the beginning.

## Conditions and effects

| Condition                                                       | True when                                       |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `{ "type": "flag", "flag": "f" }`                               | flag `f` is `true` (or `equals` value)          |
| `{ "type": "flag", "flag": "rep", "atLeast": 10 }`              | numeric flag is at least 10                     |
| `{ "type": "memory", "npc": "ken", "event": "PLAYER_MET_NPC" }` | the NPC remembers it (optional `quest`)         |
| `{ "type": "quest", "quest": "q", "status": "active" }`         | status is `not_started/active/completed/failed` |
| `{ "type": "quest", ..., "objective": "o" }`                    | …and `o` is the current objective               |
| `{ "type": "hasItem", "item": "apple", "quantity": 2 }`         | the bag holds at least that many                |
| `{ "type": "money", "atLeast": 50 }`                            | the player has at least that much money         |
| `{ "type": "not", "condition": { ... } }`                       | inner condition is false                        |

| Effect                                                                   | Does                                        |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| `{ "type": "setFlag", "flag": "f", "value": 3 }`                         | sets a world flag (default `true`)          |
| `{ "type": "adjustFlag", "flag": "rep", "by": 10 }`                      | adds to a numeric flag (unset = 0)          |
| `{ "type": "startQuest", "quest": "q" }`                                 | starts (or restarts a failed) quest         |
| `{ "type": "failQuest", "quest": "q" }`                                  | fails an active quest                       |
| `{ "type": "remember", "npc": "somchai", "event": "PLAYER_HELPED_NPC" }` | the NPC remembers it                        |
| `{ "type": "giveItem", "item": "apple", "quantity": 2 }`                 | adds items (overflow is reported, not kept) |
| `{ "type": "takeItem", "item": "apple" }`                                | removes up to that many                     |
| `{ "type": "adjustMoney", "amount": 50 }`                                | adds or removes money (never below 0)       |
| `{ "type": "openShop", "shop": "ken_shop" }`                             | opens a shop's panel (no state change)      |
