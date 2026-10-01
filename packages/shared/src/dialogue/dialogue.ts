import type {
  DialogueChoice,
  DialogueDef,
  DialogueNode,
  Effect,
  GameContent,
  NpcDef,
} from '../content/types';
import { evaluateAll } from '../state/conditions';
import type { GameState } from '../state/gameState';

/** Where a running conversation currently is. */
export interface DialogueCursor {
  readonly dialogue: string;
  readonly node: string;
}

/** Result of moving through a conversation: the new position (null = ended) and what to apply. */
export interface DialogueStep {
  readonly cursor: DialogueCursor | null;
  readonly effects: readonly Effect[];
}

export interface AvailableChoice {
  /** Index into the node's full choice list (stable even when some choices are hidden). */
  readonly index: number;
  readonly choice: DialogueChoice;
}

/** Picks the first of the NPC's dialogues whose conditions hold. */
export function selectDialogue(
  npc: NpcDef,
  state: GameState,
  content: GameContent,
): DialogueDef | undefined {
  const ref = npc.dialogues.find((d) => evaluateAll(d.when, state, content));
  return ref ? content.dialogues[ref.dialogue] : undefined;
}

export function getNode(content: GameContent, cursor: DialogueCursor): DialogueNode {
  const node = content.dialogues[cursor.dialogue]?.nodes[cursor.node];
  if (!node) throw new Error(`Unknown dialogue node: ${cursor.dialogue}/${cursor.node}`);
  return node;
}

export function beginDialogue(dialogue: DialogueDef, content: GameContent): DialogueStep {
  return enter(content, { dialogue: dialogue.id, node: dialogue.start }, []);
}

export function availableChoices(
  node: DialogueNode,
  state: GameState,
  content: GameContent,
): AvailableChoice[] {
  return (node.choices ?? [])
    .map((choice, index) => ({ index, choice }))
    .filter(({ choice }) => evaluateAll(choice.when, state, content));
}

/**
 * Moves past a node without choices. Returns null when the node is waiting for a choice
 * (callers should ignore the "continue" input in that case).
 */
export function advanceDialogue(
  cursor: DialogueCursor,
  state: GameState,
  content: GameContent,
): DialogueStep | null {
  const node = getNode(content, cursor);
  if (availableChoices(node, state, content).length > 0) return null;
  return enter(content, node.next ? { ...cursor, node: node.next } : null, []);
}

/** Picks a choice by its index in the node's full choice list. Null if it is not available. */
export function chooseDialogueOption(
  cursor: DialogueCursor,
  index: number,
  state: GameState,
  content: GameContent,
): DialogueStep | null {
  const node = getNode(content, cursor);
  const picked = availableChoices(node, state, content).find((c) => c.index === index);
  if (!picked) return null;
  const { choice } = picked;
  return enter(
    content,
    choice.next ? { ...cursor, node: choice.next } : null,
    choice.effects ?? [],
  );
}

function enter(
  content: GameContent,
  cursor: DialogueCursor | null,
  effects: readonly Effect[],
): DialogueStep {
  if (!cursor) return { cursor: null, effects };
  return { cursor, effects: [...effects, ...(getNode(content, cursor).effects ?? [])] };
}
