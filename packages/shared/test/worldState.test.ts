import { describe, expect, it } from 'vitest';
import {
  applyEffects,
  createInitialState,
  evaluateCondition,
  failQuest,
  npcPosition,
  objectTexture,
  startQuest,
} from '../src';
import { content } from './fixtures';

const fresh = createInitialState();
const [, friend] = content.npcs;
const sign = content.objects[0]!;

describe('numeric world state', () => {
  it('adjustFlag adds to numbers and treats unset or non-numeric flags as 0', () => {
    let state = applyEffects(fresh, content, [{ type: 'adjustFlag', flag: 'rep', by: 10 }]).state;
    state = applyEffects(state, content, [{ type: 'adjustFlag', flag: 'rep', by: -3 }]).state;
    expect(state.flags.rep).toBe(7);
    state = applyEffects(state, content, [
      { type: 'setFlag', flag: 'odd', value: 'x' },
      { type: 'adjustFlag', flag: 'odd', by: 2 },
    ]).state;
    expect(state.flags.odd).toBe(2);
  });

  it('atLeast compares numeric flags only', () => {
    const state = applyEffects(fresh, content, [
      { type: 'setFlag', flag: 'rep', value: 20 },
      { type: 'setFlag', flag: 'name', value: 'x' },
    ]).state;
    const atLeast = (flag: string, n: number) =>
      evaluateCondition({ type: 'flag', flag, atLeast: n }, state, content);
    expect(atLeast('rep', 20)).toBe(true);
    expect(atLeast('rep', 21)).toBe(false);
    expect(atLeast('name', 0)).toBe(false);
    expect(atLeast('missing', 0)).toBe(false);
  });
});

describe('quest failure', () => {
  it('fails only active quests and reports it', () => {
    const active = startQuest(fresh, content, 'q1').state;
    const result = failQuest(active, content, 'q1');
    expect(result.notices).toEqual([{ type: 'questFailed', quest: 'q1' }]);
    expect(result.state.quests.q1?.status).toBe('failed');
    expect(failQuest(fresh, content, 'q1').notices).toEqual([]);
  });

  it('a failed quest can be started again from the beginning', () => {
    const failed = failQuest(startQuest(fresh, content, 'q1').state, content, 'q1').state;
    const restarted = startQuest(failed, content, 'q1');
    expect(restarted.notices).toEqual([{ type: 'questStarted', quest: 'q1' }]);
    expect(restarted.state.quests.q1).toEqual({ status: 'active', objectiveIndex: 0 });
  });

  it('the failQuest effect fails a quest', () => {
    const active = startQuest(fresh, content, 'q1').state;
    const state = applyEffects(active, content, [{ type: 'failQuest', quest: 'q1' }]).state;
    expect(state.quests.q1?.status).toBe('failed');
  });
});

describe('world reacts to state', () => {
  it('NPC schedules depend on time of day and world state', () => {
    expect(npcPosition(friend!, fresh, content)).toEqual({ x: 0, y: 0 });
    expect(npcPosition(friend!, fresh, content, 'night')).toEqual({ x: 3, y: 0 });
    const moved = applyEffects(fresh, content, [{ type: 'setFlag', flag: 'moved' }]).state;
    expect(npcPosition(friend!, moved, content)).toEqual({ x: 2, y: 0 });
  });

  it('objects change appearance with world state', () => {
    expect(objectTexture(sign, fresh, content)).toBe('sign_closed');
    const open = applyEffects(fresh, content, [{ type: 'setFlag', flag: 'open' }]).state;
    expect(objectTexture(sign, open, content)).toBe('sign_open');
  });
});
