import type { GameContent } from '../content/types';
import { handleQuestEvent, type Outcome, type QuestEvent } from '../quests/quests';
import type { GameState } from './gameState';
import { remember } from './memory';

/** Something the player did in the world. Currently the same set quests listen for. */
export type GameEvent = QuestEvent;

/**
 * Single entry point for player actions: updates NPC memory, then lets quests react.
 * New systems that care about player actions (reputation, achievements…) hook in here.
 */
export function handleGameEvent(state: GameState, content: GameContent, event: GameEvent): Outcome {
  const remembered =
    event.type === 'talk' ? remember(state, event.npc, { event: 'PLAYER_MET_NPC' }) : state;
  return handleQuestEvent(remembered, content, event);
}
