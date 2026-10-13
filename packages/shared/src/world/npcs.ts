import { conditionHolds, type QuestCondition } from '../dialogue/dialogue';
import type { QuestLog } from '../quests/quests';

/** Which dialogue an NPC uses; the first option whose conditions all hold is chosen. */
export interface NpcDialogueOption {
  readonly when?: readonly QuestCondition[];
  readonly dialogue: string;
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  /** Tile the NPC stands on. */
  readonly xTiles: number;
  readonly yTiles: number;
  /** Ordered most specific first; the last option should have no conditions. */
  readonly dialogue: readonly NpcDialogueOption[];
}

/** The dialogue id this NPC uses given current quest progress, or undefined if none applies. */
export function selectNpcDialogue(npc: NpcDef, log: QuestLog): string | undefined {
  return npc.dialogue.find((o) => (o.when ?? []).every((c) => conditionHolds(log, c)))?.dialogue;
}
