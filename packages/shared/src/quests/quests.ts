import type { Effect, GameContent, ObjectiveDef } from '../content/types';
import type { GameState, QuestProgress } from '../state/gameState';
import { setFlag } from '../state/gameState';
import { remember } from '../state/memory';
import { addItem, countItem, removeItem } from '../inventory/inventory';
import { mergeOutcomes as merge, type GameNotice, type Outcome } from '../state/notices';

/** Something that happened in the world which quest objectives may be waiting for. */
export type QuestEvent =
  | { readonly type: 'talk'; readonly npc: string }
  | { readonly type: 'reach'; readonly location: string };

export function currentObjective(
  state: GameState,
  content: GameContent,
  questId: string,
): ObjectiveDef | undefined {
  const progress = state.quests[questId];
  if (progress?.status !== 'active') return undefined;
  return content.quests[questId]?.objectives[progress.objectiveIndex];
}

export function activeQuestIds(state: GameState): string[] {
  return Object.keys(state.quests).filter((id) => state.quests[id]?.status === 'active');
}

/**
 * Starts a quest. Active and completed quests are left untouched; a failed quest starts over,
 * so players can change their mind (the quest giver still remembers the failure).
 */
export function startQuest(state: GameState, content: GameContent, questId: string): Outcome {
  if (!content.quests[questId]) throw new Error(`Unknown quest: ${questId}`);
  const status = state.quests[questId]?.status;
  if (status === 'active' || status === 'completed') return { state, notices: [] };
  const next = withProgress(state, questId, { status: 'active', objectiveIndex: 0 });
  return { state: next, notices: [{ type: 'questStarted', quest: questId }] };
}

/** Fails an active quest; anything else is left untouched. */
export function failQuest(state: GameState, content: GameContent, questId: string): Outcome {
  const quest = content.quests[questId];
  if (!quest) throw new Error(`Unknown quest: ${questId}`);
  const progress = state.quests[questId];
  if (progress?.status !== 'active') return { state, notices: [] };
  let next = withProgress(state, questId, { ...progress, status: 'failed' });
  if (quest.giver) {
    next = remember(next, quest.giver, { event: 'PLAYER_FAILED_QUEST', quest: questId });
  }
  return { state: next, notices: [{ type: 'questFailed', quest: questId }] };
}

/** Advances every active quest whose current objective is satisfied by `event`. */
export function handleQuestEvent(
  state: GameState,
  content: GameContent,
  event: QuestEvent,
): Outcome {
  let result: Outcome = { state, notices: [] };
  for (const questId of activeQuestIds(state)) {
    const objective = currentObjective(result.state, content, questId);
    if (objective && objectiveMatches(objective, event, result.state)) {
      result = merge(result, completeObjective(result.state, content, questId));
    }
  }
  return result;
}

export function applyEffects(
  state: GameState,
  content: GameContent,
  effects: readonly Effect[] | undefined,
): Outcome {
  let result: Outcome = { state, notices: [] };
  for (const effect of effects ?? []) {
    switch (effect.type) {
      case 'setFlag':
        result = { ...result, state: setFlag(result.state, effect.flag, effect.value ?? true) };
        break;
      case 'adjustFlag': {
        const current = result.state.flags[effect.flag];
        const base = typeof current === 'number' ? current : 0;
        result = { ...result, state: setFlag(result.state, effect.flag, base + effect.by) };
        break;
      }
      case 'startQuest':
        result = merge(result, startQuest(result.state, content, effect.quest));
        break;
      case 'failQuest':
        result = merge(result, failQuest(result.state, content, effect.quest));
        break;
      case 'remember':
        result = { ...result, state: remember(result.state, effect.npc, { event: effect.event }) };
        break;
      case 'giveItem': {
        const quantity = effect.quantity ?? 1;
        const add = addItem(result.state, content, effect.item, quantity);
        const notices: GameNotice[] = [];
        if (add.added > 0)
          notices.push({ type: 'itemsReceived', item: effect.item, quantity: add.added });
        if (add.leftover > 0)
          notices.push({ type: 'bagFull', item: effect.item, quantity: add.leftover });
        result = merge(result, { state: add.state, notices });
        break;
      }
      case 'takeItem': {
        const take = removeItem(result.state, effect.item, effect.quantity ?? 1);
        const notices: GameNotice[] =
          take.removed > 0
            ? [{ type: 'itemsRemoved', item: effect.item, quantity: take.removed }]
            : [];
        result = merge(result, { state: take.state, notices });
        break;
      }
      case 'adjustMoney': {
        const money = Math.max(0, result.state.money + Math.trunc(effect.amount));
        const amount = money - result.state.money;
        if (amount !== 0) {
          result = merge(result, {
            state: { ...result.state, money },
            notices: [{ type: 'moneyChanged', amount }],
          });
        }
        break;
      }
      case 'openShop':
        break; // presentation only: the client opens its shop UI
    }
  }
  return result;
}

function objectiveMatches(objective: ObjectiveDef, event: QuestEvent, state: GameState): boolean {
  switch (objective.type) {
    case 'talk':
      return event.type === 'talk' && event.npc === objective.npc;
    case 'deliver':
      return (
        event.type === 'talk' &&
        event.npc === objective.npc &&
        countItem(state, objective.item) >= (objective.quantity ?? 1)
      );
    case 'reach':
      return event.type === 'reach' && event.location === objective.location;
  }
}

function completeObjective(state: GameState, content: GameContent, questId: string): Outcome {
  const quest = content.quests[questId]!;
  const progress = state.quests[questId]!;
  const objective = quest.objectives[progress.objectiveIndex]!;
  const objectiveIndex = progress.objectiveIndex + 1;
  const notices: GameNotice[] = [];
  if (objective.type === 'deliver') {
    const taken = removeItem(state, objective.item, objective.quantity ?? 1);
    state = taken.state;
    notices.push({ type: 'itemsRemoved', item: objective.item, quantity: taken.removed });
  }
  notices.push({ type: 'objectiveCompleted', quest: questId, objective: objective.id });

  if (objectiveIndex < quest.objectives.length) {
    return { state: withProgress(state, questId, { status: 'active', objectiveIndex }), notices };
  }

  let completed = withProgress(state, questId, { status: 'completed', objectiveIndex });
  if (quest.giver) {
    completed = remember(completed, quest.giver, {
      event: 'PLAYER_COMPLETED_QUEST',
      quest: questId,
    });
  }
  let result: Outcome = {
    state: completed,
    notices: [...notices, { type: 'questCompleted', quest: questId }],
  };
  result = merge(result, applyEffects(result.state, content, quest.rewards));
  if (quest.next) result = merge(result, startQuest(result.state, content, quest.next));
  return result;
}

function withProgress(state: GameState, questId: string, progress: QuestProgress): GameState {
  return { ...state, quests: { ...state.quests, [questId]: progress } };
}
