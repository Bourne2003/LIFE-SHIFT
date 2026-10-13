import { changeItem, itemCount, type Inventory } from '../items/items';
import { completeStep, currentStep, questStatus, startQuest } from '../quests/quests';
import type { QuestDef, QuestLog, QuestStatus } from '../quests/quests';

/** What an NPC remembers about the player. */
export interface NpcMemory {
  /** Conversations started with this NPC. */
  readonly talks: number;
}

/**
 * Everything about the world that the player can change. Plain, JSON-safe data: it is what gets
 * saved, and later what a server will own.
 */
export interface GameState {
  readonly quests: QuestLog;
  /** World facts set by story effects, e.g. "somchai-stall-open". */
  readonly flags: Readonly<Record<string, boolean>>;
  readonly npcs: Readonly<Record<string, NpcMemory>>;
  /** Baht. Never negative. */
  readonly money: number;
  readonly inventory: Inventory;
}

/** Money a new game starts with. */
export const STARTING_MONEY = 50;

export const INITIAL_STATE: GameState = Object.freeze({
  quests: {},
  flags: {},
  npcs: {},
  money: STARTING_MONEY,
  inventory: {},
});

/** A fact about the game state that content can test. */
export type StoryCondition =
  /** The quest is in `status` (and, if given, at `step`). */
  | { readonly quest: string; readonly status: QuestStatus; readonly step?: string }
  /** The world flag is set (or, with `is: false`, not set). */
  | { readonly flag: string; readonly is?: boolean }
  /** The player has (or has not) talked to this NPC before. */
  | { readonly npc: string; readonly met: boolean }
  /** The player carries at least `count` (default 1) of the item — or, with `has: false`, fewer. */
  | { readonly item: string; readonly count?: number; readonly has?: boolean };

/** A change to game state triggered by content (dialogue, quest completion). */
export type StoryEffect =
  | { readonly type: 'startQuest'; readonly quest: string }
  | { readonly type: 'completeStep'; readonly quest: string; readonly step: string }
  | { readonly type: 'setFlag'; readonly flag: string; readonly value?: boolean }
  /** Gives (positive) or takes (negative) items; taking never goes below zero. */
  | { readonly type: 'changeItem'; readonly item: string; readonly count: number }
  /** Gives (positive) or takes (negative) money; never goes below zero. */
  | { readonly type: 'changeMoney'; readonly amount: number };

export type QuestCatalog = Readonly<Record<string, QuestDef>>;

export function hasMet(state: GameState, npcId: string): boolean {
  return (state.npcs[npcId]?.talks ?? 0) > 0;
}

export function conditionHolds(state: GameState, c: StoryCondition): boolean {
  if ('quest' in c) {
    if (questStatus(state.quests, c.quest) !== c.status) return false;
    return c.step === undefined || currentStep(state.quests, c.quest) === c.step;
  }
  if ('flag' in c) return (state.flags[c.flag] ?? false) === (c.is ?? true);
  if ('item' in c) return itemCount(state.inventory, c.item) >= (c.count ?? 1) === (c.has ?? true);
  return hasMet(state, c.npc) === c.met;
}

export function allHold(state: GameState, conditions: readonly StoryCondition[] | undefined) {
  return (conditions ?? []).every((c) => conditionHolds(state, c));
}

/**
 * Applies effects in order. Completing a quest's last step also applies the quest's `onComplete`
 * effects — this is how finishing a quest changes the world.
 */
export function applyEffects(
  state: GameState,
  effects: readonly StoryEffect[] | undefined,
  quests: QuestCatalog,
): GameState {
  let result = state;
  for (const effect of effects ?? []) {
    if (effect.type === 'setFlag') {
      const value = effect.value ?? true;
      if ((result.flags[effect.flag] ?? false) !== value)
        result = { ...result, flags: { ...result.flags, [effect.flag]: value } };
      continue;
    }
    if (effect.type === 'changeItem') {
      const inventory = changeItem(result.inventory, effect.item, effect.count);
      if (inventory !== result.inventory) result = { ...result, inventory };
      continue;
    }
    if (effect.type === 'changeMoney') {
      const money = Math.max(0, result.money + effect.amount);
      if (money !== result.money) result = { ...result, money };
      continue;
    }
    const quest = quests[effect.quest];
    if (!quest) throw new Error(`Unknown quest "${effect.quest}"`);
    if (effect.type === 'startQuest') {
      result = withQuests(result, startQuest(result.quests, quest));
      continue;
    }
    const wasCompleted = questStatus(result.quests, quest.id) === 'completed';
    result = withQuests(result, completeStep(result.quests, quest, effect.step));
    if (!wasCompleted && questStatus(result.quests, quest.id) === 'completed')
      result = applyEffects(result, quest.onComplete, quests);
  }
  return result;
}

function withQuests(state: GameState, quests: QuestLog): GameState {
  return quests === state.quests ? state : { ...state, quests };
}

/** Remembers that a conversation with `npcId` started. */
export function recordTalk(state: GameState, npcId: string): GameState {
  const talks = (state.npcs[npcId]?.talks ?? 0) + 1;
  return { ...state, npcs: { ...state.npcs, [npcId]: { talks } } };
}
