import type { FlagValue, GameContent, ItemStack, MemoryEvent, QuestStatus } from '../content/types';

export interface QuestProgress {
  readonly status: QuestStatus;
  /** Index of the current objective; equals the objective count once completed. */
  readonly objectiveIndex: number;
}

/** One thing an NPC remembers about the player. */
export interface NpcMemory {
  readonly event: MemoryEvent;
  readonly quest?: string;
}

/**
 * The single source of truth for mutable game progress. Immutable: every change produces a new
 * object, which makes changes easy to observe, test, save and (later) validate on a server.
 */
export interface GameState {
  readonly flags: Readonly<Record<string, FlagValue>>;
  readonly quests: Readonly<Record<string, QuestProgress>>;
  /** NPC id → what they remember, oldest first. */
  readonly memories: Readonly<Record<string, readonly NpcMemory[]>>;
  /** Whole currency units, never negative. */
  readonly money: number;
  /** Bag slots in order; each holds one stack of one item. */
  readonly inventory: readonly ItemStack[];
}

/** An empty state (no money, empty bag). Use newGameState() for the start of a real game. */
export function createInitialState(): GameState {
  return { flags: {}, quests: {}, memories: {}, money: 0, inventory: [] };
}

/** The state a new game starts with, including starting money and items from content. */
export function newGameState(content: GameContent): GameState {
  return {
    ...createInitialState(),
    money: content.economy.startingMoney,
    inventory: content.economy.startingItems.map((s) => ({ ...s })),
  };
}

export function getFlag(state: GameState, flag: string): FlagValue | undefined {
  return state.flags[flag];
}

export function setFlag(state: GameState, flag: string, value: FlagValue): GameState {
  if (state.flags[flag] === value) return state;
  return { ...state, flags: { ...state.flags, [flag]: value } };
}
