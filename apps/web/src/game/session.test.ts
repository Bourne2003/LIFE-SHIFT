import { describe, expect, it } from 'vitest';
import { CONTENT } from '@life-shift/game-data';
import { GameSession, type SessionEvent } from './session';

function finish(session: GameSession): void {
  while (session.inConversation) session.advance();
}

describe('GameSession', () => {
  it('tracks the nearby NPC and ignores unknown ids', () => {
    const session = new GameSession(CONTENT);
    session.setNearbyNpc('mina');
    expect(session.nearbyNpc?.name).toEqual({ th: 'มีนา', en: 'Mina' });
    session.setNearbyNpc('nobody');
    expect(session.nearbyNpc).toBeNull();
  });

  it('runs a conversation with choices', () => {
    const session = new GameSession(CONTENT);
    expect(session.talkTo('mina')).toBe(true);
    expect(session.talkTo('alex')).toBe(false); // one conversation at a time
    expect(session.conversation).toMatchObject({
      npcId: 'mina',
      speaker: { th: 'มีนา', en: 'Mina' },
      choices: [],
    });

    session.advance();
    expect(session.conversation?.choices).toHaveLength(2);
    session.moveSelection(1);
    expect(session.conversation?.selected).toBe(1);
    session.moveSelection(1);
    expect(session.conversation?.selected).toBe(0); // wraps
    session.choose(1); // decline
    finish(session);
    expect(session.quests).toEqual({});
  });

  it("completes Mina's recipe and reports quest events", () => {
    const session = new GameSession(CONTENT);
    const events: SessionEvent[] = [];
    session.on((e) => (e.type === 'questStarted' || e.type === 'questCompleted') && events.push(e));

    session.talkTo('mina');
    session.advance();
    session.advance(); // accept (first choice is highlighted)
    finish(session);
    expect(session.trackedQuests).toEqual([
      {
        id: 'minas-recipe',
        title: { th: 'สูตรลับของมีนา', en: "Mina's Recipe" },
        step: { th: 'นำสูตรอาหารไปให้สมชาย', en: 'Bring the recipe to Somchai' },
      },
    ]);

    session.talkTo('somchai');
    finish(session);
    expect(session.trackedQuests[0]?.step.en).toBe('Tell Mina the recipe arrived');

    session.talkTo('mina');
    finish(session);
    expect(session.quests['minas-recipe']).toEqual({ status: 'completed' });
    expect(session.trackedQuests).toEqual([]);
    expect(events.map((e) => e.type)).toEqual(['questStarted', 'questCompleted']);
    // The world changed: Somchai's stall is now part of the city.
    expect(session.state.flags['somchai-stall-open']).toBe(true);
    expect(session.visibleProps.map((p) => p.id)).toEqual(['somchai-noodle-stall']);
  });

  it('ignores choices that do not exist', () => {
    const session = new GameSession(CONTENT);
    session.talkTo('alex');
    session.choose(0); // line without choices
    expect(session.inConversation).toBe(true);
    session.advance();
    expect(session.inConversation).toBe(false);
  });

  it('remembers who the player has talked to', () => {
    const session = new GameSession(CONTENT);
    session.talkTo('alex');
    expect(session.conversation?.text.en).toMatch(/Morning/); // first meeting
    finish(session);
    session.talkTo('alex');
    expect(session.conversation?.text.en).toMatch(/you again/);
    finish(session);
    expect(session.state.npcs.alex).toEqual({ talks: 2 });
  });

  it('reports persistent changes but not UI-only ones as stateChanged', () => {
    const session = new GameSession(CONTENT);
    let changes = 0;
    session.on((e) => e.type === 'stateChanged' && changes++);
    session.setNearbyNpc('mina');
    expect(changes).toBe(0);
    session.talkTo('mina'); // remembering the meeting is a state change
    expect(changes).toBe(1);
    session.advance();
    session.moveSelection(1); // highlight only
    expect(changes).toBe(1);
  });

  it('continues from a loaded state, reconciled with current content', () => {
    const session = new GameSession(CONTENT, {
      quests: { 'minas-recipe': { status: 'completed' }, 'removed-quest': { status: 'completed' } },
      flags: { 'somchai-stall-open': true },
      npcs: { mina: { talks: 3 } },
      money: 10,
      inventory: { 'removed-item': 1 },
    });
    expect(session.state.inventory).toEqual({}); // unknown items dropped
    expect(Object.keys(session.quests)).toEqual(['minas-recipe']);
    expect(session.visibleProps).toHaveLength(1);
    session.talkTo('mina');
    expect(session.conversation?.text.en).toMatch(/finally cooks it right/);
  });

  it('opens Aunt Daeng’s shop from dialogue and buys with the player’s money', () => {
    const session = new GameSession(CONTENT);
    const events: string[] = [];
    session.on((e) => events.push(e.type));
    session.talkTo('daeng');
    session.advance(); // first choice: "let me see your goods"
    expect(session.inConversation).toBe(false);
    expect(session.inShop).toBe(true);
    const shop = session.shopView!;
    expect(shop.entries.map((e) => e.item)).toEqual([
      'jasmine-garland',
      'thai-iced-tea',
      'mango-sticky-rice',
    ]);

    session.buySelected();
    expect(session.state.inventory).toEqual({ 'jasmine-garland': 1 });
    expect(session.state.money).toBe(50 - 20);
    expect(events).toContain('purchased');
    expect(session.shopView!.entries[0]!.owned).toBe(1);

    session.moveSelection(-1); // wraps to the last entry (35 baht; 30 left)
    expect(session.shopView!.selected).toBe(2);
    expect(session.shopView!.entries[2]!.affordable).toBe(false);
    session.buySelected();
    expect(events).toContain('cannotAfford');
    expect(session.state.money).toBe(30);

    session.closeShop();
    expect(session.inShop).toBe(false);
  });

  it('lists the bag and reports quest rewards as money received', () => {
    const session = new GameSession(CONTENT, {
      quests: { 'pims-garland': { status: 'active', step: 'bring' } },
      flags: {},
      npcs: {},
      money: 0,
      inventory: { 'jasmine-garland': 1 },
    });
    expect(session.inventory.map((e) => [e.item, e.count])).toEqual([['jasmine-garland', 1]]);
    const received: number[] = [];
    session.on((e) => e.type === 'moneyReceived' && received.push(e.amount));
    session.talkTo('pim');
    finish(session);
    expect(session.inventory).toEqual([]);
    expect(received).toEqual([30]);

    session.toggleInventory();
    expect(session.inventoryOpen).toBe(true);
    session.toggleInventory();
    expect(session.inventoryOpen).toBe(false);
  });
});
