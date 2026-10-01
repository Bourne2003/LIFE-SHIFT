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

export type Condition =
  /** True when the flag equals `equals` (default `true`). Unset flags never match. */
  | { readonly type: 'flag'; readonly flag: string; readonly equals?: FlagValue }
  /** Quest status check; with `objective`, also requires that objective to be the current one. */
  | {
      readonly type: 'quest';
      readonly quest: string;
      readonly status: QuestStatus | 'not_started';
      readonly objective?: string;
    }
  | { readonly type: 'not'; readonly condition: Condition };

export type Effect =
  | { readonly type: 'setFlag'; readonly flag: string; readonly value?: FlagValue }
  | { readonly type: 'startQuest'; readonly quest: string };

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

export interface ScheduleEntry {
  readonly period: TimePeriod | 'any';
  readonly position: TilePos;
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
  /** Default tile position. */
  readonly position: TilePos;
  /** Where the NPC is during each part of the day (used once the game clock exists). */
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

export interface GameContent {
  readonly map: MapDef;
  readonly npcs: readonly NpcDef[];
  readonly dialogues: Readonly<Record<string, DialogueDef>>;
  readonly quests: Readonly<Record<string, QuestDef>>;
}
