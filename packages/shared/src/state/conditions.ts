import type { Condition, GameContent } from '../content/types';
import type { GameState } from './gameState';
import { hasMemory } from './memory';

export function evaluateCondition(
  condition: Condition,
  state: GameState,
  content: GameContent,
): boolean {
  switch (condition.type) {
    case 'flag': {
      const value = state.flags[condition.flag];
      if (value === undefined) return false;
      if (condition.atLeast !== undefined) {
        return typeof value === 'number' && value >= condition.atLeast;
      }
      return value === (condition.equals ?? true);
    }
    case 'quest': {
      const progress = state.quests[condition.quest];
      if (condition.status === 'not_started') return progress === undefined;
      if (progress?.status !== condition.status) return false;
      if (condition.objective === undefined) return true;
      const current = content.quests[condition.quest]?.objectives[progress.objectiveIndex];
      return current?.id === condition.objective;
    }
    case 'memory':
      return hasMemory(state, condition.npc, condition.event, condition.quest);
    case 'not':
      return !evaluateCondition(condition.condition, state, content);
  }
}

/** True when every condition holds; an absent or empty list is always true. */
export function evaluateAll(
  conditions: readonly Condition[] | undefined,
  state: GameState,
  content: GameContent,
): boolean {
  return (conditions ?? []).every((c) => evaluateCondition(c, state, content));
}
