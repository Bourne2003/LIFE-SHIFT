import type { LocalizedText } from '../i18n/locale';
import { completeStep, currentStep, questStatus, startQuest } from '../quests/quests';
import type { QuestDef, QuestLog, QuestStatus } from '../quests/quests';

/** True when the quest is in `status` (and, if given, at `step`). */
export interface QuestCondition {
  readonly quest: string;
  readonly status: QuestStatus;
  readonly step?: string;
}

/** A change to game state triggered by dialogue. */
export type StoryEffect =
  | { readonly type: 'startQuest'; readonly quest: string }
  | { readonly type: 'completeStep'; readonly quest: string; readonly step: string };

export interface DialogueChoice {
  readonly text: LocalizedText;
  /** Node to continue with; omitted ends the conversation. */
  readonly next?: string;
  readonly effects?: readonly StoryEffect[];
}

export interface DialogueNode {
  /** Defaults to the name of the NPC being talked to. */
  readonly speaker?: LocalizedText;
  readonly text: LocalizedText;
  /** Applied when the node is shown. */
  readonly effects?: readonly StoryEffect[];
  /** Node shown after this one when it has no choices; omitted ends the conversation. */
  readonly next?: string;
  readonly choices?: readonly DialogueChoice[];
}

export interface DialogueDef {
  readonly id: string;
  readonly start: string;
  readonly nodes: Readonly<Record<string, DialogueNode>>;
}

export type QuestCatalog = Readonly<Record<string, QuestDef>>;

export function conditionHolds(log: QuestLog, condition: QuestCondition): boolean {
  if (questStatus(log, condition.quest) !== condition.status) return false;
  return condition.step === undefined || currentStep(log, condition.quest) === condition.step;
}

export function applyEffects(
  log: QuestLog,
  effects: readonly StoryEffect[] | undefined,
  quests: QuestCatalog,
): QuestLog {
  let result = log;
  for (const effect of effects ?? []) {
    const quest = quests[effect.quest];
    if (!quest) throw new Error(`Unknown quest "${effect.quest}"`);
    result =
      effect.type === 'startQuest'
        ? startQuest(result, quest)
        : completeStep(result, quest, effect.step);
  }
  return result;
}

/** Where a conversation is: the node being shown, or null once it has ended. */
export interface DialogueStep {
  readonly node: string | null;
  readonly log: QuestLog;
}

function enter(
  dialogue: DialogueDef,
  nodeId: string | undefined,
  log: QuestLog,
  quests: QuestCatalog,
): DialogueStep {
  if (nodeId === undefined) return { node: null, log };
  const node = dialogue.nodes[nodeId];
  if (!node) throw new Error(`Dialogue "${dialogue.id}" has no node "${nodeId}"`);
  return { node: nodeId, log: applyEffects(log, node.effects, quests) };
}

/** Opens a dialogue at its start node, applying that node's effects. */
export function beginDialogue(
  dialogue: DialogueDef,
  log: QuestLog,
  quests: QuestCatalog,
): DialogueStep {
  return enter(dialogue, dialogue.start, log, quests);
}

/**
 * Moves on from `nodeId`. Nodes with choices need a valid `choiceIndex`; the choice's effects are
 * applied before entering the next node.
 */
export function advanceDialogue(
  dialogue: DialogueDef,
  nodeId: string,
  log: QuestLog,
  quests: QuestCatalog,
  choiceIndex?: number,
): DialogueStep {
  const node = dialogue.nodes[nodeId];
  if (!node) throw new Error(`Dialogue "${dialogue.id}" has no node "${nodeId}"`);
  if (!node.choices?.length) return enter(dialogue, node.next, log, quests);
  const choice = choiceIndex === undefined ? undefined : node.choices[choiceIndex];
  if (!choice) throw new Error(`Node "${nodeId}" needs a choice in 0..${node.choices.length - 1}`);
  return enter(dialogue, choice.next, applyEffects(log, choice.effects, quests), quests);
}
