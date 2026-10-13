import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  SAVE_VERSION,
  STARTING_MONEY,
  parseSave,
  reconcileState,
  serializeSave,
  type GameState,
  type QuestCatalog,
} from '../src';

const state: GameState = {
  quests: { q: { status: 'active', step: 'two' }, done: { status: 'completed' } },
  flags: { open: true },
  npcs: { mina: { talks: 3 } },
  money: 120,
  inventory: { garland: 2 },
};

describe('save format', () => {
  it('round-trips state and player position', () => {
    const json = serializeSave(state, { x: 10, y: 20 }, new Date('2026-10-13T00:00:00Z'));
    const result = parseSave(json);
    expect(result).toEqual({
      ok: true,
      save: {
        version: SAVE_VERSION,
        savedAt: '2026-10-13T00:00:00.000Z',
        state,
        player: { x: 10, y: 20 },
      },
    });
  });

  it('rejects data that is not a save', () => {
    expect(parseSave('not json')).toEqual({ ok: false, error: 'not JSON' });
    expect(parseSave('[]')).toEqual({ ok: false, error: 'not an object' });
    expect(parseSave('{}')).toEqual({ ok: false, error: 'missing version' });
    expect(parseSave(JSON.stringify({ version: 99 }))).toMatchObject({ ok: false });
  });

  it('drops bad entries instead of failing the whole save', () => {
    const json = JSON.stringify({
      version: SAVE_VERSION,
      state: {
        quests: { good: { status: 'completed' }, bad: { status: 'lost' }, odd: 5 },
        flags: { yes: true, nope: 'true' },
        npcs: { a: { talks: 2 }, b: { talks: -1 }, c: { talks: 1.5 } },
        money: -5,
        inventory: { ok: 1, zero: 0, neg: -2, frac: 0.5 },
      },
      player: { x: 'far', y: 1 },
    });
    const result = parseSave(json);
    expect(result.ok && result.save.state).toEqual({
      quests: { good: { status: 'completed' } },
      flags: { yes: true },
      npcs: { a: { talks: 2 } },
      money: STARTING_MONEY,
      inventory: { ok: 1 },
    });
    expect(result.ok && result.save.player).toBeNull();
  });

  it('upgrades a version 1 save (before money and items existed)', () => {
    const v1 = JSON.stringify({
      version: 1,
      savedAt: 'x',
      state: { quests: { q: { status: 'completed' } }, flags: { open: true }, npcs: {} },
      player: { x: 1, y: 2 },
    });
    const result = parseSave(v1);
    expect(result.ok && result.save).toEqual({
      version: SAVE_VERSION,
      savedAt: 'x',
      state: {
        quests: { q: { status: 'completed' } },
        flags: { open: true },
        npcs: {},
        money: STARTING_MONEY,
        inventory: {},
      },
      player: { x: 1, y: 2 },
    });
  });

  it('treats a save without state as a fresh game', () => {
    const result = parseSave(JSON.stringify({ version: SAVE_VERSION }));
    expect(result.ok && result.save.state).toEqual(INITIAL_STATE);
  });
});

describe('reconcileState', () => {
  const quests: QuestCatalog = {
    q: {
      id: 'q',
      title: { th: 'q', en: 'q' },
      steps: [{ id: 'one', description: { th: '1', en: '1' } }],
    },
  };

  it('drops removed quests and items, and restarts quests whose step was removed', () => {
    const fixed = reconcileState(state, { quests, items: {} });
    expect(fixed.quests).toEqual({ q: { status: 'active', step: 'one' } });
    expect(fixed.inventory).toEqual({});
    expect(fixed.flags).toBe(state.flags);
  });
});
