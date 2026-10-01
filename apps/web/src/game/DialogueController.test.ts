import { describe, expect, it } from 'vitest';
import { loadContent } from '@life-shift/game-data';
import { countItem, type GameNotice } from '@life-shift/shared';
import { DialogueController, talkerFromNpc, talkerFromObject } from './DialogueController';
import { GameSession } from './GameSession';

const content = loadContent();
const npc = (id: string) => talkerFromNpc(content.npcs.find((n) => n.id === id)!);

function setup() {
  const session = new GameSession(content);
  const dialogue = new DialogueController(session);
  const notices: GameNotice[] = [];
  session.on('notice', (n) => notices.push(n));
  return { session, dialogue, notices };
}

describe('DialogueController with the shipped content', () => {
  it('plays the full "Getting to Know Ban Suan" quest', () => {
    const { session, dialogue, notices } = setup();

    // Noi offers the quest; accepting starts it.
    expect(dialogue.start(npc('noi'))).toBe(true);
    expect(dialogue.view()?.speaker).toBe('Grandma Noi');
    dialogue.advance();
    expect(dialogue.view()?.choices.map((c) => c.text)).toHaveLength(2);
    dialogue.advance(); // ignored: waiting for a choice
    expect(dialogue.view()?.choices).toHaveLength(2);
    dialogue.choose(0);
    expect(session.state.quests.q_know_town?.status).toBe('active');
    dialogue.advance();
    expect(dialogue.active).toBe(false);

    // Ken's quest-specific dialogue; talking completes the first objective.
    dialogue.start(npc('ken'));
    expect(dialogue.view()?.text).toMatch(/Noi sent you/);
    while (dialogue.active) dialogue.advance();
    expect(session.state.quests.q_know_town?.objectiveIndex).toBe(1);

    // Talking to Noi before visiting the tower does not finish the quest.
    dialogue.start(npc('noi'));
    expect(dialogue.view()?.text).toMatch(/Still exploring/);
    dialogue.close();

    session.handleEvent({ type: 'reach', location: 'clock_tower' });
    dialogue.start(npc('noi'));
    expect(dialogue.view()?.text).toMatch(/Back already/);
    dialogue.choose(1);
    dialogue.advance();

    expect(session.state.quests.q_know_town?.status).toBe('completed');
    expect(session.state.flags.knows_town).toBe(true);
    expect(notices.map((n) => n.type)).toEqual([
      'questStarted',
      'objectiveCompleted',
      'objectiveCompleted',
      'objectiveCompleted',
      'questCompleted',
      'moneyChanged', // reward
    ]);

    // Afterwards Noi has new things to say.
    dialogue.start(npc('noi'));
    expect(dialogue.view()?.text).toMatch(/talking about you/);
  });

  it('declining the offer leaves the quest unstarted', () => {
    const { session, dialogue } = setup();
    dialogue.start(npc('noi'));
    dialogue.advance();
    dialogue.choose(1);
    expect(dialogue.view()?.text).toMatch(/Suit yourself/);
    dialogue.advance();
    expect(session.state.quests.q_know_town).toBeUndefined();
  });

  it('names the player as the speaker on player lines', () => {
    const { dialogue } = setup();
    dialogue.start(npc('bun'));
    dialogue.advance();
    expect(dialogue.view()?.speaker).toBe('You');
  });

  it('emits null when a conversation ends', () => {
    const { dialogue } = setup();
    const views: unknown[] = [];
    dialogue.on('change', (v) => views.push(v));
    dialogue.start(npc('lek'));
    dialogue.advance();
    expect(views.at(-1)).toBeNull();
  });
});

describe('Fresh Ingredients: consequences and memory', () => {
  const sign = talkerFromObject(content.objects.find((o) => o.id === 'restaurant_sign')!);

  it('delivering the produce opens the restaurant and changes what people say', () => {
    const { session, dialogue, notices } = setup();
    dialogue.start(sign);
    expect(dialogue.view()?.speaker).toBe('Restaurant sign');
    expect(dialogue.view()?.text).toMatch(/CLOSED/);
    dialogue.advance();

    dialogue.start(npc('somchai'));
    dialogue.choose(0); // Can I help?
    dialogue.choose(0); // I'll get it.
    dialogue.advance();
    expect(session.state.quests.q_delivery?.status).toBe('active');

    dialogue.start(npc('mali'));
    expect(dialogue.view()?.text).toMatch(/For Somchai/);
    while (dialogue.active) dialogue.advance();
    expect(countItem(session.state, 'produce_crate')).toBe(1);

    const moneyBefore = session.state.money;
    dialogue.start(npc('somchai'));
    expect(dialogue.view()?.speaker).toBe('You');
    while (dialogue.active) dialogue.advance();

    expect(countItem(session.state, 'produce_crate')).toBe(0);
    expect(session.state.money).toBe(moneyBefore + 50);
    expect(session.state.flags).toMatchObject({ restaurant_open: true, market_reputation: 10 });
    expect(notices).toContainEqual({ type: 'questCompleted', quest: 'q_delivery' });

    dialogue.start(sign);
    expect(dialogue.view()?.text).toMatch(/OPEN/);
    dialogue.close();
    dialogue.start(npc('mali'));
    expect(dialogue.view()?.text).toMatch(/favourite customer/);
    dialogue.close();
    dialogue.start(npc('somchai'));
    expect(dialogue.view()?.text).toMatch(/Welcome to Somchai's Kitchen/);
  });

  it('giving up fails the quest; Somchai remembers and offers a second chance', () => {
    const { session, dialogue, notices } = setup();
    dialogue.start(npc('somchai'));
    dialogue.choose(0);
    dialogue.choose(0);
    dialogue.close();

    dialogue.start(npc('somchai'));
    expect(dialogue.view()?.text).toMatch(/Any luck/);
    dialogue.choose(1); // I can't do this.
    expect(notices.at(-1)).toEqual({ type: 'questFailed', quest: 'q_delivery' });
    expect(session.state.memories.somchai).toContainEqual({
      event: 'PLAYER_FAILED_QUEST',
      quest: 'q_delivery',
    });
    dialogue.close();

    dialogue.start(npc('somchai'));
    expect(dialogue.view()?.text).toMatch(/Changed your mind/);
    dialogue.choose(0);
    expect(session.state.quests.q_delivery).toEqual({ status: 'active', objectiveIndex: 0 });
  });

  it('Ken greets returning visitors differently', () => {
    const { dialogue } = setup();
    dialogue.start(npc('ken'));
    expect(dialogue.view()?.text).toMatch(/New face/);
    dialogue.close();
    dialogue.start(npc('ken'));
    expect(dialogue.view()?.text).toMatch(/Back again/);
  });

  it('objects do not count as meeting someone', () => {
    const { session, dialogue } = setup();
    dialogue.start(sign);
    expect(session.state.memories).toEqual({});
  });
});

describe('shops', () => {
  it('a shopkeeper line opens their shop, and trades go through the session', () => {
    const { session, dialogue } = setup();
    const opened: string[] = [];
    dialogue.on('openShop', (shop) => opened.push(shop));

    dialogue.start(npc('ken'));
    dialogue.advance(); // "Need anything?"
    dialogue.choose(0); // Let me browse.
    expect(dialogue.active).toBe(false);
    expect(opened).toEqual(['ken_shop']);

    const bought = session.buy('ken_shop', 'bread', 1);
    expect(bought.ok).toBe(true);
    expect(session.state.money).toBe(85);
    expect(countItem(session.state, 'bread')).toBe(1);

    const sold = session.sell('ken_shop', 'bread', 1);
    expect(sold).toMatchObject({ ok: true, receipt: { total: 6 } }); // 40% of 15
    expect(session.state.money).toBe(91);
  });

  it("Somchai's kitchen only trades once the restaurant is open", () => {
    const { session } = setup();
    expect(session.buy('somchai_kitchen', 'green_curry', 1)).toEqual({
      ok: false,
      reason: 'shop_closed',
    });
    session.applyEffects([{ type: 'setFlag', flag: 'restaurant_open' }]);
    expect(session.buy('somchai_kitchen', 'green_curry', 1).ok).toBe(true);
  });

  it('a refused trade changes nothing and emits nothing', () => {
    const { session, notices } = setup();
    const before = session.state;
    expect(session.buy('mali_stall', 'mangosteen', 6)).toEqual({
      ok: false,
      reason: 'not_enough_money',
    });
    expect(session.state).toBe(before);
    expect(notices).toEqual([]);
  });
});
