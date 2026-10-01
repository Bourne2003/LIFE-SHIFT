import { describe, expect, it } from 'vitest';
import {
  applyEffects,
  createInitialState,
  currentObjective,
  evaluateCondition,
  handleQuestEvent,
  startQuest,
} from '../src';
import { content } from './fixtures';

const fresh = createInitialState();

describe('conditions', () => {
  it('flag conditions default to equals true and never match unset flags', () => {
    const state = applyEffects(fresh, content, [{ type: 'setFlag', flag: 'a' }]).state;
    expect(evaluateCondition({ type: 'flag', flag: 'a' }, state, content)).toBe(true);
    expect(evaluateCondition({ type: 'flag', flag: 'b' }, state, content)).toBe(false);
    expect(evaluateCondition({ type: 'flag', flag: 'a', equals: false }, state, content)).toBe(
      false,
    );
  });

  it('quest conditions check status and current objective', () => {
    const notStarted = { type: 'quest', quest: 'q1', status: 'not_started' } as const;
    expect(evaluateCondition(notStarted, fresh, content)).toBe(true);

    const state = startQuest(fresh, content, 'q1').state;
    expect(evaluateCondition(notStarted, state, content)).toBe(false);
    expect(
      evaluateCondition(
        { type: 'quest', quest: 'q1', status: 'active', objective: 'talk_friend' },
        state,
        content,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: 'quest', quest: 'q1', status: 'active', objective: 'reach_pond' },
        state,
        content,
      ),
    ).toBe(false);
  });

  it('not inverts', () => {
    expect(
      evaluateCondition({ type: 'not', condition: { type: 'flag', flag: 'x' } }, fresh, content),
    ).toBe(true);
  });
});

describe('quest engine', () => {
  it('starts a quest once', () => {
    const first = startQuest(fresh, content, 'q1');
    expect(first.notices).toEqual([{ type: 'questStarted', quest: 'q1' }]);
    expect(first.state.quests.q1).toEqual({ status: 'active', objectiveIndex: 0 });

    const again = startQuest(first.state, content, 'q1');
    expect(again.notices).toEqual([]);
    expect(again.state).toBe(first.state);
  });

  it('rejects unknown quests', () => {
    expect(() => startQuest(fresh, content, 'nope')).toThrow(/Unknown quest/);
  });

  it('ignores events that do not match the current objective', () => {
    const state = startQuest(fresh, content, 'q1').state;
    // The pond is objective 2; reaching it first does nothing.
    const result = handleQuestEvent(state, content, { type: 'reach', location: 'pond' });
    expect(result.notices).toEqual([]);
    expect(currentObjective(result.state, content, 'q1')?.id).toBe('talk_friend');
  });

  it('completes objectives in order, applies rewards and starts the follow-up', () => {
    let state = startQuest(fresh, content, 'q1').state;

    const talked = handleQuestEvent(state, content, { type: 'talk', npc: 'friend' });
    expect(talked.notices).toEqual([
      { type: 'objectiveCompleted', quest: 'q1', objective: 'talk_friend' },
    ]);
    state = talked.state;

    const reached = handleQuestEvent(state, content, { type: 'reach', location: 'pond' });
    expect(reached.notices).toEqual([
      { type: 'objectiveCompleted', quest: 'q1', objective: 'reach_pond' },
      { type: 'questCompleted', quest: 'q1' },
      { type: 'questStarted', quest: 'q2' },
    ]);
    expect(reached.state.quests.q1).toEqual({ status: 'completed', objectiveIndex: 2 });
    expect(reached.state.flags.q1_reward).toBe(5);
    expect(currentObjective(reached.state, content, 'q2')?.id).toBe('back');
  });

  it('does not touch the input state (immutability)', () => {
    const state = startQuest(fresh, content, 'q1').state;
    const snapshot = JSON.stringify(state);
    handleQuestEvent(state, content, { type: 'talk', npc: 'friend' });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
