import type { FlagValue, QuestStatus } from '../content/types';

export interface QuestProgress {
  readonly status: QuestStatus;
  /** Index of the current objective; equals the objective count once completed. */
  readonly objectiveIndex: number;
}

/**
 * The single source of truth for mutable game progress. Immutable: every change produces a new
 * object, which makes changes easy to observe, test, save and (later) validate on a server.
 */
export interface GameState {
  readonly flags: Readonly<Record<string, FlagValue>>;
  readonly quests: Readonly<Record<string, QuestProgress>>;
}

export function createInitialState(): GameState {
  return { flags: {}, quests: {} };
}

export function getFlag(state: GameState, flag: string): FlagValue | undefined {
  return state.flags[flag];
}

export function setFlag(state: GameState, flag: string, value: FlagValue): GameState {
  if (state.flags[flag] === value) return state;
  return { ...state, flags: { ...state.flags, [flag]: value } };
}
