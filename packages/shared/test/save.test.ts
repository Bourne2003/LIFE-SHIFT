import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  applyEffects,
  createInitialState,
  createSave,
  loadSave,
  remember,
  startQuest,
  type GameState,
} from '../src';
import { content } from './fixtures';

function played(): GameState {
  let state = startQuest(createInitialState(), content, 'q1').state;
  state = applyEffects(state, content, [
    { type: 'setFlag', flag: 'open' },
    { type: 'adjustFlag', flag: 'rep', by: 5 },
  ]).state;
  return remember(state, 'friend', { event: 'PLAYER_MET_NPC' });
}

const roundTrip = (json: string) => loadSave(json, content);

describe('save / load', () => {
  it('round-trips state and player position', () => {
    const save = createSave(played(), { x: 3, y: 0 }, new Date('2026-10-01T00:00:00Z'));
    const result = roundTrip(JSON.stringify(save));
    expect(result).toEqual({ ok: true, save, warnings: [] });
    expect(save.saveVersion).toBe(SAVE_VERSION);
  });

  it('rejects garbage, non-saves and saves from newer versions', () => {
    expect(roundTrip('{nope')).toEqual({ ok: false, error: 'Save data is not valid JSON' });
    expect(roundTrip('[]')).toMatchObject({ ok: false, error: 'Not a LIFE SHIFT save' });
    expect(roundTrip('{"saveVersion":0}')).toMatchObject({ ok: false });
    expect(roundTrip(JSON.stringify({ saveVersion: SAVE_VERSION + 1 }))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/newer version/),
    });
  });

  it('drops data that no longer matches the content instead of crashing', () => {
    const json = JSON.stringify({
      saveVersion: 1,
      savedAt: 'x',
      state: {
        flags: { ok: true, bad: { nested: 1 }, nan: null },
        quests: {
          q1: { status: 'active', objectiveIndex: 1 },
          removed_quest: { status: 'active', objectiveIndex: 0 },
          q2: { status: 'completed', objectiveIndex: 0 }, // completed must be at the end
        },
        memories: {
          friend: [{ event: 'PLAYER_MET_NPC' }, { event: 'MADE_UP' }, 'junk'],
          ghost: [{ event: 'PLAYER_MET_NPC' }],
        },
      },
      player: { tile: { x: 1, y: 1 } }, // a building
    });
    const result = roundTrip(json);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.state).toEqual({
      flags: { ok: true },
      quests: { q1: { status: 'active', objectiveIndex: 1 } },
      memories: { friend: [{ event: 'PLAYER_MET_NPC' }] },
      // added by the v1 → v2 migration
      money: 100,
      inventory: [{ item: 'apple', quantity: 2 }],
    });
    expect(result.save.player.tile).toEqual(content.map.spawn);
    expect(result.warnings.length).toBeGreaterThanOrEqual(5);
  });

  it('runs migrations in order up to the current version', () => {
    const migrations = {
      1: (s: Record<string, unknown>) => ({ ...s, state: { flags: s.flagsV1 } }),
      2: (s: Record<string, unknown>) => ({ ...s, player: { tile: s.playerTileV2 } }),
    };
    const v1 = JSON.stringify({
      saveVersion: 1,
      flagsV1: { old: true },
      playerTileV2: { x: 3, y: 0 },
    });
    const result = loadSave(v1, content, migrations, 3);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.saveVersion).toBe(3);
    expect(result.save.state.flags).toEqual({ old: true });
    expect(result.save.player.tile).toEqual({ x: 3, y: 0 });
  });

  it('fails clearly when a migration is missing', () => {
    expect(loadSave('{"saveVersion":1}', content, {}, 2)).toEqual({
      ok: false,
      error: 'No migration from save version 1',
    });
  });
});

describe('save format v2: money and bag', () => {
  it('migrates a v1 save by granting the starting money and items', () => {
    const v1 = JSON.stringify({
      saveVersion: 1,
      savedAt: '2026-10-01T00:00:00.000Z',
      state: { flags: { knows_town: true }, quests: {}, memories: {} },
      player: { tile: { x: 0, y: 0 } },
    });
    const result = roundTrip(v1);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.saveVersion).toBe(2);
    expect(result.save.state.flags).toEqual({ knows_town: true });
    expect(result.save.state.money).toBe(100);
    expect(result.save.state.inventory).toEqual([{ item: 'apple', quantity: 2 }]);
  });

  it('sanitises money and bag contents', () => {
    const v2 = (state: object) =>
      roundTrip(
        JSON.stringify({ saveVersion: 2, savedAt: 'x', state, player: { tile: { x: 0, y: 0 } } }),
      );
    const bad = v2({
      money: -5,
      inventory: [
        { item: 'apple', quantity: 99 }, // over max stack (5)
        { item: 'gone_item', quantity: 1 },
        { item: 'rice', quantity: 0 },
        'junk',
      ],
    });
    if (!bad.ok) throw new Error(bad.error);
    expect(bad.save.state.money).toBe(0);
    expect(bad.save.state.inventory).toEqual([{ item: 'apple', quantity: 5 }]);

    const tooMany = v2({
      money: 1,
      inventory: [
        ...Array.from({ length: 25 }, () => ({ item: 'rice', quantity: 1 })),
        { item: 'letter', quantity: 1 },
      ],
    });
    if (!tooMany.ok) throw new Error(tooMany.error);
    expect(tooMany.save.state.inventory.filter((s) => s.item === 'rice')).toHaveLength(20);
    expect(tooMany.save.state.inventory).toContainEqual({ item: 'letter', quantity: 1 });
  });
});
