/**
 * Content schema: the shape of the data files in packages/game-data. Gameplay systems are driven
 * by these definitions; adding an NPC, dialogue or quest should never require code changes.
 */

export interface TilePos {
  readonly x: number;
  readonly y: number;
}

export type FlagValue = boolean | number | string;

export type QuestStatus = 'active' | 'completed' | 'failed';

/** Things an NPC can remember about the player. Extend as new kinds of interaction appear. */
export type MemoryEvent =
  'PLAYER_MET_NPC' | 'PLAYER_HELPED_NPC' | 'PLAYER_COMPLETED_QUEST' | 'PLAYER_FAILED_QUEST';

export const MEMORY_EVENTS: readonly MemoryEvent[] = [
  'PLAYER_MET_NPC',
  'PLAYER_HELPED_NPC',
  'PLAYER_COMPLETED_QUEST',
  'PLAYER_FAILED_QUEST',
];

export type Condition =
  /**
   * Flag check. With `equals`: the flag equals it. With `atLeast`: the flag is a number >= it.
   * With neither: the flag is `true`. Unset flags never match.
   */
  | {
      readonly type: 'flag';
      readonly flag: string;
      readonly equals?: FlagValue;
      readonly atLeast?: number;
    }
  /** Quest status check; with `objective`, also requires that objective to be the current one. */
  | {
      readonly type: 'quest';
      readonly quest: string;
      readonly status: QuestStatus | 'not_started';
      readonly objective?: string;
    }
  /** The NPC remembers `event` (optionally about a specific quest). */
  | {
      readonly type: 'memory';
      readonly npc: string;
      readonly event: MemoryEvent;
      readonly quest?: string;
    }
  /** The player carries at least `quantity` (default 1) of an item. */
  | { readonly type: 'hasItem'; readonly item: string; readonly quantity?: number }
  /** The player has at least this much money. */
  | { readonly type: 'money'; readonly atLeast: number }
  | { readonly type: 'not'; readonly condition: Condition };

export type Effect =
  | { readonly type: 'setFlag'; readonly flag: string; readonly value?: FlagValue }
  /** Adds `by` to a numeric flag (unset counts as 0). */
  | { readonly type: 'adjustFlag'; readonly flag: string; readonly by: number }
  /** Starts a quest; restarts it if it previously failed. */
  | { readonly type: 'startQuest'; readonly quest: string }
  | { readonly type: 'failQuest'; readonly quest: string }
  | { readonly type: 'remember'; readonly npc: string; readonly event: MemoryEvent }
  /** Adds items to the bag (quantity defaults to 1). */
  | { readonly type: 'giveItem'; readonly item: string; readonly quantity?: number }
  /** Removes up to `quantity` (default 1) of an item. */
  | { readonly type: 'takeItem'; readonly item: string; readonly quantity?: number }
  /** Adds (or with a negative amount, removes) money; never goes below 0. */
  | { readonly type: 'adjustMoney'; readonly amount: number }
  /** Presentation only: asks the client to open a shop. Does not change game state. */
  | { readonly type: 'openShop'; readonly shop: string };

// ---------------------------------------------------------------------------------------------
// Dialogue: Dialogue → Node → Choice → Condition / Effect → next Node
// ---------------------------------------------------------------------------------------------

export interface DialogueChoice {
  readonly text: string;
  /** Node to go to; omitted ends the conversation. */
  readonly next?: string;
  /** Choice is only offered when every condition holds. */
  readonly when?: readonly Condition[];
  readonly effects?: readonly Effect[];
}

export interface DialogueNode {
  /** NPC id or `player`; defaults to the NPC being talked to. */
  readonly speaker?: string;
  readonly text: string;
  /** Used when the node has no choices; omitted ends the conversation. */
  readonly next?: string;
  readonly choices?: readonly DialogueChoice[];
  /** Applied when the node is shown. */
  readonly effects?: readonly Effect[];
}

export interface DialogueDef {
  readonly id: string;
  readonly start: string;
  readonly nodes: Readonly<Record<string, DialogueNode>>;
}

// ---------------------------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------------------------

export type ObjectiveDef =
  | {
      readonly id: string;
      readonly description: string;
      readonly type: 'talk';
      readonly npc: string;
    }
  | {
      readonly id: string;
      readonly description: string;
      readonly type: 'reach';
      readonly location: string;
    }
  /** Talk to `npc` while carrying the items; they are handed over when it completes. */
  | {
      readonly id: string;
      readonly description: string;
      readonly type: 'deliver';
      readonly npc: string;
      readonly item: string;
      readonly quantity?: number;
    };

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** NPC who offers the quest (informational; the offer itself lives in their dialogue). */
  readonly giver?: string;
  /** Completed one after another, in order. */
  readonly objectives: readonly ObjectiveDef[];
  /** Applied once when the last objective completes. */
  readonly rewards: readonly Effect[];
  /** Follow-up quest started automatically on completion. */
  readonly next?: string;
}

// ---------------------------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------------------------

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Where an NPC stands. The first entry whose period matches and whose conditions hold wins,
 * so world changes (e.g. a shop opening) can move people around.
 */
export interface ScheduleEntry {
  readonly period: TimePeriod | 'any';
  readonly position: TilePos;
  readonly when?: readonly Condition[];
}

export interface NpcDialogueRef {
  readonly dialogue: string;
  /** The first entry whose conditions all hold is used. */
  readonly when?: readonly Condition[];
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly occupation: string;
  readonly personality: readonly string[];
  /** Placeholder tint until real sprites exist, e.g. `#d9544f`. */
  readonly color: string;
  /** Default tile position (used when no schedule entry applies). */
  readonly position: TilePos;
  /** Where the NPC is, by time of day and world state. */
  readonly schedule: readonly ScheduleEntry[];
  readonly dialogues: readonly NpcDialogueRef[];
  /** Other NPC id → relationship, e.g. `friend`, `family`, `rival`. */
  readonly relationships: Readonly<Record<string, string>>;
  /** Quests this NPC is involved in. */
  readonly quests: readonly string[];
}

// ---------------------------------------------------------------------------------------------
// World map
// ---------------------------------------------------------------------------------------------

export interface TileArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LocationDef {
  readonly id: string;
  readonly name: string;
  readonly area: TileArea;
  /** Not announced until discovered (used by future exploration rewards). */
  readonly hidden?: boolean;
}

export interface MapDef {
  readonly id: string;
  readonly name: string;
  /** Character in `rows` → tile kind id (see TILE_KINDS). */
  readonly legend: Readonly<Record<string, string>>;
  /** One string per row, one character per tile; all rows have equal length. */
  readonly rows: readonly string[];
  readonly spawn: TilePos;
  readonly locations: readonly LocationDef[];
}

// ---------------------------------------------------------------------------------------------
// World objects: signs, doors, notice boards — things you can inspect but that are not people.
// ---------------------------------------------------------------------------------------------

export interface AppearanceRef {
  /** Texture key provided by the client's art (placeholder or real). */
  readonly texture: string;
  readonly when?: readonly Condition[];
}

export interface WorldObjectDef {
  readonly id: string;
  readonly name: string;
  readonly position: TilePos;
  /** First matching entry is shown, so world state can change how the object looks. */
  readonly appearances: readonly AppearanceRef[];
  /** First matching dialogue is used when the player inspects the object. */
  readonly dialogues: readonly NpcDialogueRef[];
}

// ---------------------------------------------------------------------------------------------
// Items and economy
// ---------------------------------------------------------------------------------------------

export type ItemCategory = 'food' | 'ingredient' | 'quest' | 'misc';

export const ITEM_CATEGORIES: readonly ItemCategory[] = ['food', 'ingredient', 'quest', 'misc'];

export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ItemCategory;
  /** How many fit in one bag slot. */
  readonly maxStack: number;
  /** Base price in whole currency units; shops may override when selling. */
  readonly price: number;
  /** Whether shops will buy it from the player (quest items: no). */
  readonly sellable: boolean;
}

export interface ItemStack {
  readonly item: string;
  readonly quantity: number;
}

export interface ShopDef {
  readonly id: string;
  readonly name: string;
  /** NPC who runs it (their dialogue offers the shop). */
  readonly owner: string;
  /** Items for sale; `price` overrides the item's base price. */
  readonly stock: readonly { readonly item: string; readonly price?: number }[];
  /** Categories this shop buys from the player. */
  readonly buys: readonly ItemCategory[];
  /** Fraction of the base price paid when buying from the player (0–1). */
  readonly buybackRate: number;
  /** Only trades while every condition holds. */
  readonly when?: readonly Condition[];
}

export interface EconomyDef {
  /** Shown before amounts, e.g. `฿`. */
  readonly currencySymbol: string;
  readonly startingMoney: number;
  readonly startingItems: readonly ItemStack[];
}

export interface GameContent {
  readonly map: MapDef;
  readonly npcs: readonly NpcDef[];
  readonly objects: readonly WorldObjectDef[];
  readonly dialogues: Readonly<Record<string, DialogueDef>>;
  readonly quests: Readonly<Record<string, QuestDef>>;
  readonly items: Readonly<Record<string, ItemDef>>;
  readonly shops: Readonly<Record<string, ShopDef>>;
  readonly economy: EconomyDef;
}
