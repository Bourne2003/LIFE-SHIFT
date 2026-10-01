import { describe, expect, it } from 'vitest';
import {
  MAX_MEMORIES_PER_NPC,
  applyEffects,
  createInitialState,
  evaluateCondition,
  failQuest,
  handleGameEvent,
  handleQuestEvent,
  hasMemory,
  memoriesOf,
  remember,
  startQuest,
} from '../src';
import { content } from './fixtures';

const fresh = createInitialState();

describe('NPC memory', () => {
  it('records the first meeting when the player talks to an NPC', () => {
    const state = handleGameEvent(fresh, content, { type: 'talk', npc: 'friend' }).state;
    expect(hasMemory(state, 'friend', 'PLAYER_MET_NPC')).toBe(true);
    expect(hasMemory(state, 'giver', 'PLAYER_MET_NPC')).toBe(false);
    expect(
      evaluateCondition({ type: 'memory', npc: 'friend', event: 'PLAYER_MET_NPC' }, state, content),
    ).toBe(true);
  });

  it('keeps identical memories once and returns the same state when nothing changes', () => {
    const once = remember(fresh, 'friend', { event: 'PLAYER_MET_NPC' });
    expect(remember(once, 'friend', { event: 'PLAYER_MET_NPC' })).toBe(once);
    const twice = remember(remember(once, 'friend', { event: 'PLAYER_HELPED_NPC' }), 'friend', {
      event: 'PLAYER_MET_NPC',
    });
    expect(memoriesOf(twice, 'friend').map((m) => m.event)).toEqual([
      'PLAYER_HELPED_NPC',
      'PLAYER_MET_NPC',
    ]);
  });

  it('forgets the oldest memories beyond the cap', () => {
    let state = fresh;
    for (let i = 0; i < MAX_MEMORIES_PER_NPC + 5; i++) {
      state = remember(state, 'friend', { event: 'PLAYER_COMPLETED_QUEST', quest: `q${i}` });
    }
    const list = memoriesOf(state, 'friend');
    expect(list).toHaveLength(MAX_MEMORIES_PER_NPC);
    expect(list[0]?.quest).toBe('q5');
  });

  it('quest givers remember completed and failed quests', () => {
    let state = startQuest(fresh, content, 'q1').state;
    state = handleQuestEvent(state, content, { type: 'talk', npc: 'friend' }).state;
    state = handleQuestEvent(state, content, { type: 'reach', location: 'pond' }).state;
    expect(hasMemory(state, 'giver', 'PLAYER_COMPLETED_QUEST', 'q1')).toBe(true);

    const failed = failQuest(startQuest(fresh, content, 'q1').state, content, 'q1').state;
    expect(hasMemory(failed, 'giver', 'PLAYER_FAILED_QUEST', 'q1')).toBe(true);
  });

  it('the remember effect records an event', () => {
    const state = applyEffects(fresh, content, [
      { type: 'remember', npc: 'friend', event: 'PLAYER_HELPED_NPC' },
    ]).state;
    expect(hasMemory(state, 'friend', 'PLAYER_HELPED_NPC')).toBe(true);
  });
});
