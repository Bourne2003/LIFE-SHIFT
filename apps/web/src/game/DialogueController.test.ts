import { describe, expect, it } from 'vitest';
import { loadContent } from '@life-shift/game-data';
import type { QuestNotice } from '@life-shift/shared';
import { DialogueController } from './DialogueController';
import { GameSession } from './GameSession';

const content = loadContent();
const npc = (id: string) => content.npcs.find((n) => n.id === id)!;

function setup() {
  const session = new GameSession(content);
  const dialogue = new DialogueController(session);
  const notices: QuestNotice[] = [];
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

    session.questEvent({ type: 'reach', location: 'clock_tower' });
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
