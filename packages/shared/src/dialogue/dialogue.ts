import type { LocalizedText } from '../i18n/locale';
import {
  applyEffects,
  type GameState,
  type QuestCatalog,
  type StoryEffect,
} from '../state/gameState';

export interface DialogueChoice {
  readonly text: LocalizedText;
  /** Node to continue with; omitted ends the conversation. */
  readonly next?: string;
  readonly effects?: readonly StoryEffect[];
  /** Opens this shop when chosen (normally on a choice without `next`). */
  readonly opensShop?: string;
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

/** Where a conversation is: the node being shown, or null once it has ended. */
export interface DialogueStep {
  readonly node: string | null;
  readonly state: GameState;
}

function enter(
  dialogue: DialogueDef,
  nodeId: string | undefined,
  state: GameState,
  quests: QuestCatalog,
): DialogueStep {
  if (nodeId === undefined) return { node: null, state };
  const node = dialogue.nodes[nodeId];
  if (!node) throw new Error(`Dialogue "${dialogue.id}" has no node "${nodeId}"`);
  return { node: nodeId, state: applyEffects(state, node.effects, quests) };
}

/** Opens a dialogue at its start node, applying that node's effects. */
export function beginDialogue(
  dialogue: DialogueDef,
  state: GameState,
  quests: QuestCatalog,
): DialogueStep {
  return enter(dialogue, dialogue.start, state, quests);
}

/**
 * Moves on from `nodeId`. Nodes with choices need a valid `choiceIndex`; the choice's effects are
 * applied before entering the next node.
 */
export function advanceDialogue(
  dialogue: DialogueDef,
  nodeId: string,
  state: GameState,
  quests: QuestCatalog,
  choiceIndex?: number,
): DialogueStep {
  const node = dialogue.nodes[nodeId];
  if (!node) throw new Error(`Dialogue "${dialogue.id}" has no node "${nodeId}"`);
  if (!node.choices?.length) return enter(dialogue, node.next, state, quests);
  const choice = choiceIndex === undefined ? undefined : node.choices[choiceIndex];
  if (!choice) throw new Error(`Node "${nodeId}" needs a choice in 0..${node.choices.length - 1}`);
  return enter(dialogue, choice.next, applyEffects(state, choice.effects, quests), quests);
}
