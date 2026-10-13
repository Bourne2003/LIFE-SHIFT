import type { DialogueDef, QuestCatalog, QuestCondition, StoryEffect } from '../dialogue/dialogue';
import type { NpcDef } from '../world/npcs';

export interface GameContent {
  readonly npcs: readonly NpcDef[];
  readonly dialogues: Readonly<Record<string, DialogueDef>>;
  readonly quests: QuestCatalog;
}

/**
 * Checks that content data is internally consistent: unique ids, every reference (dialogue, node,
 * quest, quest step) resolves. Returns human-readable problems; an empty list means valid.
 */
export function validateContent(content: GameContent): string[] {
  const problems: string[] = [];
  const { npcs, dialogues, quests } = content;

  const checkQuestRef = (where: string, quest: string, step?: string) => {
    const def = quests[quest];
    if (!def) problems.push(`${where}: unknown quest "${quest}"`);
    else if (step !== undefined && !def.steps.some((s) => s.id === step))
      problems.push(`${where}: quest "${quest}" has no step "${step}"`);
  };
  const checkEffects = (where: string, effects: readonly StoryEffect[] | undefined) => {
    for (const e of effects ?? [])
      checkQuestRef(where, e.quest, e.type === 'completeStep' ? e.step : undefined);
  };
  const checkConditions = (where: string, conditions: readonly QuestCondition[] | undefined) => {
    for (const c of conditions ?? []) checkQuestRef(where, c.quest, c.step);
  };

  for (const [key, quest] of Object.entries(quests)) {
    if (quest.id !== key) problems.push(`quest "${key}": id is "${quest.id}"`);
    if (quest.steps.length === 0) problems.push(`quest "${key}": has no steps`);
    const stepIds = new Set(quest.steps.map((s) => s.id));
    if (stepIds.size !== quest.steps.length) problems.push(`quest "${key}": duplicate step ids`);
  }

  for (const [key, dialogue] of Object.entries(dialogues)) {
    const where = `dialogue "${key}"`;
    if (dialogue.id !== key) problems.push(`${where}: id is "${dialogue.id}"`);
    const checkNode = (from: string, next: string | undefined) => {
      if (next !== undefined && !dialogue.nodes[next])
        problems.push(`${where} node "${from}": unknown next node "${next}"`);
    };
    if (!dialogue.nodes[dialogue.start])
      problems.push(`${where}: unknown start "${dialogue.start}"`);
    for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
      checkNode(nodeId, node.next);
      checkEffects(`${where} node "${nodeId}"`, node.effects);
      if (node.choices && node.next !== undefined)
        problems.push(`${where} node "${nodeId}": has both choices and next`);
      if (node.choices?.length === 0) problems.push(`${where} node "${nodeId}": empty choices`);
      for (const choice of node.choices ?? []) {
        checkNode(nodeId, choice.next);
        checkEffects(`${where} node "${nodeId}"`, choice.effects);
      }
    }
  }

  const npcIds = new Set<string>();
  for (const npc of npcs) {
    const where = `npc "${npc.id}"`;
    if (npcIds.has(npc.id)) problems.push(`${where}: duplicate id`);
    npcIds.add(npc.id);
    if (npc.dialogue.length === 0) problems.push(`${where}: has no dialogue`);
    else if (npc.dialogue.at(-1)?.when?.length)
      problems.push(`${where}: last dialogue option must be unconditional`);
    for (const option of npc.dialogue) {
      if (!dialogues[option.dialogue])
        problems.push(`${where}: unknown dialogue "${option.dialogue}"`);
      checkConditions(where, option.when);
    }
  }

  return problems;
}
