import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  WORLD_OBSTACLES,
  advanceDialogue,
  beginDialogue,
  isPropVisible,
  questStatus,
  recordTalk,
  selectNpcDialogue,
  validateContent,
  type GameState,
} from '@life-shift/shared';
import { CONTENT, DIALOGUES, NPCS, PROPS, QUESTS } from '../src';

type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const obstacleRects = WORLD_OBSTACLES.map((o) => ({
  x: o.xTiles,
  y: o.yTiles,
  w: o.widthTiles,
  h: o.heightTiles,
}));
const npcRect = (n: (typeof NPCS)[number]) => ({ x: n.xTiles, y: n.yTiles, w: 1, h: 1 });
const propRect = (p: (typeof PROPS)[number]) => ({
  x: p.xTiles,
  y: p.yTiles,
  w: p.widthTiles,
  h: p.heightTiles,
});

/** Talks to an NPC like the game does: remember the meeting, then run the whole dialogue. */
function talk(npcId: string, state: GameState, choose = 0): GameState {
  const npc = NPCS.find((n) => n.id === npcId)!;
  const dialogue = DIALOGUES[selectNpcDialogue(npc, state)!]!;
  let step = beginDialogue(dialogue, recordTalk(state, npcId), QUESTS);
  while (step.node) {
    const node = dialogue.nodes[step.node]!;
    step = advanceDialogue(dialogue, step.node, step.state, QUESTS, node.choices && choose);
  }
  return step.state;
}

const dialogueOf = (npcId: string, state: GameState) =>
  selectNpcDialogue(
    NPCS.find((n) => n.id === npcId)!,
    state,
  );

describe('game content', () => {
  it('is internally consistent', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('places no NPC or prop inside an obstacle, and no prop on an NPC', () => {
    for (const npc of NPCS)
      expect(
        obstacleRects.some((o) => overlaps(npcRect(npc), o)),
        npc.id,
      ).toBe(false);
    for (const prop of PROPS) {
      expect(
        obstacleRects.some((o) => overlaps(propRect(prop), o)),
        prop.id,
      ).toBe(false);
      expect(
        NPCS.some((n) => overlaps(propRect(prop), npcRect(n))),
        prop.id,
      ).toBe(false);
    }
  });

  it("Mina's recipe: talk to Mina, Somchai, then Mina — and the city changes", () => {
    const stall = PROPS.find((p) => p.id === 'somchai-noodle-stall')!;
    let s: GameState = INITIAL_STATE;
    expect(talk('mina', s, 1).quests).toEqual({}); // declining starts nothing
    s = talk('mina', s);
    expect(s.quests['minas-recipe']).toEqual({ status: 'active', step: 'deliver' });
    expect(talk('mina', s).quests).toEqual(s.quests); // reminder only
    s = talk('somchai', s);
    expect(s.quests['minas-recipe']).toEqual({ status: 'active', step: 'return' });
    expect(isPropVisible(stall, s)).toBe(false);

    s = talk('mina', s);
    expect(questStatus(s.quests, 'minas-recipe')).toBe('completed');
    expect(s.flags['somchai-stall-open']).toBe(true);
    expect(isPropVisible(stall, s)).toBe(true);
    expect(dialogueOf('somchai', s)).toBe('somchai-stall');
    expect(dialogueOf('nida', s)).toBe('nida-stall');
    expect(dialogueOf('alex', s)).toBe('alex-stall');
  });

  it('NPCs remember meeting the player', () => {
    expect(dialogueOf('alex', INITIAL_STATE)).toBe('alex-greeting');
    const s = talk('alex', INITIAL_STATE);
    expect(s.npcs.alex).toEqual({ talks: 1 });
    expect(dialogueOf('alex', s)).toBe('alex-again');
  });
});
