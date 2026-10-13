import type { LocalizedText } from '../i18n/locale';

/** A quest as authored in content data. Steps are completed in order. */
export interface QuestDef {
  readonly id: string;
  readonly title: LocalizedText;
  readonly steps: readonly QuestStepDef[];
}

export interface QuestStepDef {
  readonly id: string;
  /** Shown in the quest tracker while this step is current. */
  readonly description: LocalizedText;
}

/** Progress of a started quest. Quests that were never started have no entry. */
export type QuestProgress =
  { readonly status: 'active'; readonly step: string } | { readonly status: 'completed' };

/** Every started quest, keyed by quest id. Plain data so it can be saved and sent over a network. */
export type QuestLog = Readonly<Record<string, QuestProgress>>;

export type QuestStatus = 'notStarted' | 'active' | 'completed';

export function questStatus(log: QuestLog, questId: string): QuestStatus {
  return log[questId]?.status ?? 'notStarted';
}

/** Current step id of an active quest, otherwise undefined. */
export function currentStep(log: QuestLog, questId: string): string | undefined {
  const progress = log[questId];
  return progress?.status === 'active' ? progress.step : undefined;
}

/** Starts a quest at its first step. No-op if it was already started. */
export function startQuest(log: QuestLog, quest: QuestDef): QuestLog {
  const first = quest.steps[0];
  if (log[quest.id] || !first) return log;
  return { ...log, [quest.id]: { status: 'active', step: first.id } };
}

/**
 * Completes `stepId` if it is the quest's current step, moving to the next step or completing the
 * quest. Anything else (wrong step, inactive quest) is a no-op, so repeated triggers are harmless.
 */
export function completeStep(log: QuestLog, quest: QuestDef, stepId: string): QuestLog {
  if (currentStep(log, quest.id) !== stepId) return log;
  const index = quest.steps.findIndex((s) => s.id === stepId);
  const next = quest.steps[index + 1];
  const progress: QuestProgress = next
    ? { status: 'active', step: next.id }
    : { status: 'completed' };
  return { ...log, [quest.id]: progress };
}
