import type { DialogueDef } from '../dialogue/dialogue';
import { missingLocales, type LocalizedText } from '../i18n/locale';
import type { QuestCatalog, StoryCondition, StoryEffect } from '../state/gameState';
import type { NpcDef } from '../world/npcs';
import type { WorldPropDef } from '../world/props';

export interface GameContent {
  readonly npcs: readonly NpcDef[];
  readonly dialogues: Readonly<Record<string, DialogueDef>>;
  readonly quests: QuestCatalog;
  readonly props: readonly WorldPropDef[];
}

/**
 * Checks that content data is internally consistent: unique ids; every reference (dialogue, node,
 * quest, quest step, NPC) resolves; every flag a condition tests is set by some effect; and all
 * player-facing text exists in every locale. Returns human-readable problems; empty means valid.
 */
export function validateContent(content: GameContent): string[] {
  const problems: string[] = [];
  const { npcs, dialogues, quests, props } = content;
  const npcIdSet = new Set(npcs.map((n) => n.id));
  const flagsSet = new Set<string>();
  const flagsTested: { where: string; flag: string }[] = [];

  const checkText = (where: string, text: LocalizedText | undefined) => {
    const missing = missingLocales(text);
    if (missing.length) problems.push(`${where}: missing translation (${missing.join(', ')})`);
  };
  const checkQuestRef = (where: string, quest: string, step?: string) => {
    const def = quests[quest];
    if (!def) problems.push(`${where}: unknown quest "${quest}"`);
    else if (step !== undefined && !def.steps.some((s) => s.id === step))
      problems.push(`${where}: quest "${quest}" has no step "${step}"`);
  };
  const checkEffects = (where: string, effects: readonly StoryEffect[] | undefined) => {
    for (const e of effects ?? []) {
      if (e.type === 'setFlag') flagsSet.add(e.flag);
      else checkQuestRef(where, e.quest, e.type === 'completeStep' ? e.step : undefined);
    }
  };
  const checkConditions = (where: string, conditions: readonly StoryCondition[] | undefined) => {
    for (const c of conditions ?? []) {
      if ('quest' in c) checkQuestRef(where, c.quest, c.step);
      else if ('flag' in c) flagsTested.push({ where, flag: c.flag });
      else if (!npcIdSet.has(c.npc)) problems.push(`${where}: unknown npc "${c.npc}"`);
    }
  };

  for (const [key, quest] of Object.entries(quests)) {
    if (quest.id !== key) problems.push(`quest "${key}": id is "${quest.id}"`);
    if (quest.steps.length === 0) problems.push(`quest "${key}": has no steps`);
    const stepIds = new Set(quest.steps.map((s) => s.id));
    if (stepIds.size !== quest.steps.length) problems.push(`quest "${key}": duplicate step ids`);
    checkText(`quest "${key}" title`, quest.title);
    for (const step of quest.steps) checkText(`quest "${key}" step "${step.id}"`, step.description);
    checkEffects(`quest "${key}" onComplete`, quest.onComplete);
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
      checkText(`${where} node "${nodeId}"`, node.text);
      if (node.speaker) checkText(`${where} node "${nodeId}" speaker`, node.speaker);
      checkEffects(`${where} node "${nodeId}"`, node.effects);
      if (node.choices && node.next !== undefined)
        problems.push(`${where} node "${nodeId}": has both choices and next`);
      if (node.choices?.length === 0) problems.push(`${where} node "${nodeId}": empty choices`);
      for (const choice of node.choices ?? []) {
        checkNode(nodeId, choice.next);
        checkText(`${where} node "${nodeId}" choice`, choice.text);
        checkEffects(`${where} node "${nodeId}"`, choice.effects);
      }
    }
  }

  const npcIds = new Set<string>();
  for (const npc of npcs) {
    const where = `npc "${npc.id}"`;
    if (npcIds.has(npc.id)) problems.push(`${where}: duplicate id`);
    npcIds.add(npc.id);
    checkText(`${where} name`, npc.name);
    if (npc.dialogue.length === 0) problems.push(`${where}: has no dialogue`);
    else if (npc.dialogue.at(-1)?.when?.length)
      problems.push(`${where}: last dialogue option must be unconditional`);
    for (const option of npc.dialogue) {
      if (!dialogues[option.dialogue])
        problems.push(`${where}: unknown dialogue "${option.dialogue}"`);
      checkConditions(where, option.when);
    }
  }

  const propIds = new Set<string>();
  for (const prop of props) {
    const where = `prop "${prop.id}"`;
    if (propIds.has(prop.id)) problems.push(`${where}: duplicate id`);
    propIds.add(prop.id);
    checkConditions(where, prop.when);
  }

  for (const { where, flag } of flagsTested)
    if (!flagsSet.has(flag)) problems.push(`${where}: flag "${flag}" is never set`);

  return problems;
}
