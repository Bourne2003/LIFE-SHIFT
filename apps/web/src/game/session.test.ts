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
    session.on((e) => e.type !== 'changed' && events.push(e));

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
  });

  it('ignores choices that do not exist', () => {
    const session = new GameSession(CONTENT);
    session.talkTo('alex');
    session.choose(0); // line without choices
    expect(session.inConversation).toBe(true);
    session.advance();
    expect(session.inConversation).toBe(false);
  });
});
