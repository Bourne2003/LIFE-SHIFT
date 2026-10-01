import type { Condition, GameContent } from '../content/types';
import type { GameState } from './gameState';

export function evaluateCondition(
  condition: Condition,
  state: GameState,
  content: GameContent,
): boolean {
  switch (condition.type) {
    case 'flag': {
      const value = state.flags[condition.flag];
      return value !== undefined && value === (condition.equals ?? true);
    }
    case 'quest': {
      const progress = state.quests[condition.quest];
      if (condition.status === 'not_started') return progress === undefined;
      if (progress?.status !== condition.status) return false;
      if (condition.objective === undefined) return true;
      const current = content.quests[condition.quest]?.objectives[progress.objectiveIndex];
      return current?.id === condition.objective;
    }
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
