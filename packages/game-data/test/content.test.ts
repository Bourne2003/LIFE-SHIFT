import { describe, expect, it } from 'vitest';
import {
  advanceDialogue,
  beginDialogue,
  questStatus,
  selectNpcDialogue,
  validateContent,
  WORLD_OBSTACLES,
  type QuestLog,
} from '@life-shift/shared';
import { CONTENT, DIALOGUES, NPCS, QUESTS } from '../src';

describe('game content', () => {
  it('is internally consistent', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('places no NPC inside an obstacle', () => {
    for (const npc of NPCS) {
      const inside = WORLD_OBSTACLES.some(
        (o) =>
          npc.xTiles >= o.xTiles &&
          npc.xTiles < o.xTiles + o.widthTiles &&
          npc.yTiles >= o.yTiles &&
          npc.yTiles < o.yTiles + o.heightTiles,
      );
      expect(inside, npc.id).toBe(false);
    }
  });

  it("Mina's recipe can be completed by talking to Mina, Somchai, then Mina", () => {
    const talk = (npcId: string, log: QuestLog, choose = 0): QuestLog => {
      const npc = NPCS.find((n) => n.id === npcId)!;
      const dialogue = DIALOGUES[selectNpcDialogue(npc, log)!]!;
      let step = beginDialogue(dialogue, log, QUESTS);
      while (step.node) {
        const node = dialogue.nodes[step.node]!;
        step = advanceDialogue(dialogue, step.node, step.log, QUESTS, node.choices && choose);
      }
      return step.log;
    };

    let log: QuestLog = {};
    expect(talk('mina', log, 1)).toEqual({}); // declining starts nothing
    log = talk('mina', log);
    expect(log['minas-recipe']).toEqual({ status: 'active', step: 'deliver' });
    expect(talk('mina', log)).toEqual(log); // reminder only
    log = talk('somchai', log);
    expect(log['minas-recipe']).toEqual({ status: 'active', step: 'return' });
    log = talk('mina', log);
    expect(questStatus(log, 'minas-recipe')).toBe('completed');
  });
});
