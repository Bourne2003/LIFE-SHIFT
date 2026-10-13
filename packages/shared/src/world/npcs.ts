import type { LocalizedText } from '../i18n/locale';
import { allHold, type GameState, type StoryCondition } from '../state/gameState';

/** Which dialogue an NPC uses; the first option whose conditions all hold is chosen. */
export interface NpcDialogueOption {
  readonly when?: readonly StoryCondition[];
  readonly dialogue: string;
}

export interface NpcDef {
  readonly id: string;
  readonly name: LocalizedText;
  /** Tile the NPC stands on. */
  readonly xTiles: number;
  readonly yTiles: number;
  /** Ordered most specific first; the last option should have no conditions. */
  readonly dialogue: readonly NpcDialogueOption[];
}

/** The dialogue id this NPC uses in the current state, or undefined if none applies. */
export function selectNpcDialogue(npc: NpcDef, state: GameState): string | undefined {
  return npc.dialogue.find((o) => allHold(state, o.when))?.dialogue;
}
