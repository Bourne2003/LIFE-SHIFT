import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  STARTING_MONEY,
  WORLD_OBSTACLES,
  buyItem,
  advanceDialogue,
  beginDialogue,
  isNpcPresent,
  isPropVisible,
  questStatus,
  recordTalk,
  selectNpcDialogue,
  validateContent,
  weatherForDay,
  type GameState,
} from '@life-shift/shared';
import { CONTENT, DIALOGUES, LOCATIONS, NPCS, PROPS, QUESTS, SHOPS } from '../src';

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
      // Props mounted on buildings must sit on one; all others must stay off them.
      const onObstacle = obstacleRects.some((o) => overlaps(propRect(prop), o));
      expect(onObstacle, prop.id).toBe(!!prop.onBuilding);
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
    expect(s.money).toBe(STARTING_MONEY + 40); // quest reward
  });

  it("Pim's garland: buy at Aunt Daeng's, deliver, get paid", () => {
    let s: GameState = talk('pim', INITIAL_STATE, 1);
    expect(s.quests).toEqual({}); // declined
    s = talk('pim', s);
    expect(dialogueOf('pim', s)).toBe('pim-waiting'); // no garland yet

    const shop = SHOPS['daeng-store']!;
    const price = shop.stock.find((e) => e.item === 'jasmine-garland')!.price;
    const bought = buyItem(s, shop, 'jasmine-garland');
    if (!bought.ok) throw new Error(bought.reason);
    s = bought.state;
    expect(dialogueOf('pim', s)).toBe('pim-receive');

    s = talk('pim', s);
    expect(questStatus(s.quests, 'pims-garland')).toBe('completed');
    expect(s.inventory).toEqual({}); // the garland was handed over
    expect(s.money).toBe(STARTING_MONEY - price + 30);
    expect(dialogueOf('pim', s)).toBe('pim-after');
  });

  it('a new player can afford anything Aunt Daeng sells', () => {
    for (const { item, price } of SHOPS['daeng-store']!.stock)
      expect(price, item).toBeLessThanOrEqual(STARTING_MONEY);
  });

  it('NPCs remember meeting the player', () => {
    expect(dialogueOf('alex', INITIAL_STATE)).toBe('alex-greeting');
    const s = talk('alex', INITIAL_STATE);
    expect(s.npcs.alex).toEqual({ talks: 1 });
    expect(dialogueOf('alex', s)).toBe('alex-again');
  });

  it('the city reacts to time of day and weather', () => {
    const at = (day: number, hour: number): GameState => ({
      ...INITIAL_STATE,
      clock: { day, minute: hour * 60 },
    });
    const lanterns = PROPS.filter((p) => p.kind === 'lantern');
    expect(lanterns.length).toBeGreaterThan(0);
    for (const l of lanterns) {
      expect(isPropVisible(l, at(1, 12)), l.id).toBe(false);
      expect(isPropVisible(l, at(1, 21)), l.id).toBe(true);
    }

    const done: GameState = {
      ...at(1, 21),
      quests: { 'pims-garland': { status: 'completed' } },
    };
    expect(dialogueOf('pim', done)).toBe('pim-night');
    expect(dialogueOf('pim', { ...done, clock: { day: 1, minute: 12 * 60 } })).toBe('pim-after');

    const rainyDay = Array.from({ length: 50 }, (_, i) => i + 2).find(
      (d) => weatherForDay(d) === 'rain',
    )!;
    expect(dialogueOf('nida', at(rainyDay, 12))).toBe('nida-rain');
    expect(dialogueOf('nida', at(1, 12))).toBe('nida-greeting');
  });

  it('meets the vertical-slice scope: ~10 NPCs, ~5 quests, a secret place', () => {
    expect(NPCS.length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(QUESTS).length).toBeGreaterThanOrEqual(5);
    expect(LOCATIONS.some((l) => l.secret)).toBe(true);
  });

  it('every NPC stands in open space inside the world', () => {
    for (const npc of NPCS) {
      expect(npc.xTiles, npc.id).toBeGreaterThanOrEqual(0);
      expect(npc.xTiles, npc.id).toBeLessThan(40);
      expect(npc.yTiles, npc.id).toBeGreaterThanOrEqual(0);
      expect(npc.yTiles, npc.id).toBeLessThan(30);
    }
  });

  const buy = (s: GameState, item: string): GameState => {
    const r = buyItem(s, SHOPS['daeng-store']!, item);
    if (!r.ok) throw new Error(r.reason);
    return r.state;
  };
  const isPresent = (id: string, s: GameState) =>
    isNpcPresent(
      NPCS.find((n) => n.id === id)!,
      s,
    );

  it('The Stopped Clock: buy oil, fix the tower, the face lights up', () => {
    let s = talk('chai', INITIAL_STATE);
    expect(dialogueOf('chai', s)).toBe('chai-waiting');
    s = talk('chai', buy(s, 'machine-oil'));
    expect(questStatus(s.quests, 'stopped-clock')).toBe('completed');
    expect(s.inventory).toEqual({});
    expect(s.money).toBe(STARTING_MONEY - 25 + 30);
    expect(
      isPropVisible(
        PROPS.find((p) => p.id === 'clock-tower-face')!,
        s,
      ),
    ).toBe(true);
    expect(dialogueOf('alex', s)).toBe('alex-clock');
  });

  it('The Lost Cat: Som leaves the alley and turns up next to Ton', () => {
    let s = talk('ton', INITIAL_STATE);
    expect(isPresent('som-alley', s)).toBe(true);
    expect(isPresent('som-home', s)).toBe(false);
    s = talk('som-alley', s);
    expect(s.quests['lost-cat']).toEqual({ status: 'active', step: 'tell' });
    expect(isPresent('som-alley', s)).toBe(false);
    s = talk('ton', s);
    expect(questStatus(s.quests, 'lost-cat')).toBe('completed');
    expect(isPresent('som-home', s)).toBe(true);
    expect(s.money).toBe(STARTING_MONEY + 20);
  });

  it("Grandma Boon's curry can only be delivered in the evening or at night", () => {
    let s = talk('boon', INITIAL_STATE);
    expect(s.inventory).toEqual({ 'green-curry': 1 });
    s = talk('chai', s); // 08:00: too early
    expect(s.inventory).toEqual({ 'green-curry': 1 });
    expect(questStatus(s.quests, 'boons-curry')).toBe('active');
    s = talk('chai', { ...s, clock: { day: 1, minute: 19 * 60 } });
    expect(questStatus(s.quests, 'boons-curry')).toBe('completed');
    expect(s.inventory).toEqual({});
  });

  it('named places do not overlap, and every NPC stands in at most one', () => {
    const rect = (l: (typeof LOCATIONS)[number]) => ({
      x: l.xTiles,
      y: l.yTiles,
      w: l.widthTiles,
      h: l.heightTiles,
    });
    for (const [i, a] of LOCATIONS.entries())
      for (const b of LOCATIONS.slice(i + 1))
        expect(overlaps(rect(a), rect(b)), `${a.id} / ${b.id}`).toBe(false);
  });
});
