import type { Effect, GameContent, ObjectiveDef } from '../content/types';
import type { GameState, QuestProgress } from '../state/gameState';
import { setFlag } from '../state/gameState';

/** Something that happened in the world which quest objectives may be waiting for. */
export type QuestEvent =
  | { readonly type: 'talk'; readonly npc: string }
  | { readonly type: 'reach'; readonly location: string };

/** Player-facing news produced by a state change (shown as toasts, logged, sent to clients). */
export type QuestNotice =
  | { readonly type: 'questStarted'; readonly quest: string }
  | { readonly type: 'objectiveCompleted'; readonly quest: string; readonly objective: string }
  | { readonly type: 'questCompleted'; readonly quest: string };

export interface Outcome {
  readonly state: GameState;
  readonly notices: readonly QuestNotice[];
}

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

/** Starts a quest. Quests that were already started (in any status) are left untouched. */
export function startQuest(state: GameState, content: GameContent, questId: string): Outcome {
  if (!content.quests[questId]) throw new Error(`Unknown quest: ${questId}`);
  if (state.quests[questId]) return { state, notices: [] };
  const next = withProgress(state, questId, { status: 'active', objectiveIndex: 0 });
  return { state: next, notices: [{ type: 'questStarted', quest: questId }] };
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
    if (objective && objectiveMatches(objective, event)) {
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
      case 'startQuest':
        result = merge(result, startQuest(result.state, content, effect.quest));
        break;
    }
  }
  return result;
}

function objectiveMatches(objective: ObjectiveDef, event: QuestEvent): boolean {
  switch (objective.type) {
    case 'talk':
      return event.type === 'talk' && event.npc === objective.npc;
    case 'reach':
      return event.type === 'reach' && event.location === objective.location;
  }
}

function completeObjective(state: GameState, content: GameContent, questId: string): Outcome {
  const quest = content.quests[questId]!;
  const progress = state.quests[questId]!;
  const objective = quest.objectives[progress.objectiveIndex]!;
  const objectiveIndex = progress.objectiveIndex + 1;
  const notices: QuestNotice[] = [
    { type: 'objectiveCompleted', quest: questId, objective: objective.id },
  ];

  if (objectiveIndex < quest.objectives.length) {
    return { state: withProgress(state, questId, { status: 'active', objectiveIndex }), notices };
  }

  let result: Outcome = {
    state: withProgress(state, questId, { status: 'completed', objectiveIndex }),
    notices: [...notices, { type: 'questCompleted', quest: questId }],
  };
  result = merge(result, applyEffects(result.state, content, quest.rewards));
  if (quest.next) result = merge(result, startQuest(result.state, content, quest.next));
  return result;
}

function withProgress(state: GameState, questId: string, progress: QuestProgress): GameState {
  return { ...state, quests: { ...state.quests, [questId]: progress } };
}

function merge(previous: Outcome, next: Outcome): Outcome {
  return { state: next.state, notices: [...previous.notices, ...next.notices] };
}
