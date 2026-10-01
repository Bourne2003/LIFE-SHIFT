import { describe, expect, it, vi } from 'vitest';
import { loadContent } from '@life-shift/game-data';
import { createSave, newGameState, type TilePos } from '@life-shift/shared';
import { GameSession } from './GameSession';
import {
  MemorySaveStorage,
  SaveService,
  readInitialSave,
  type SaveStatus,
  type SaveStorage,
} from './SaveService';

const content = loadContent();

function setup(storage: SaveStorage = new MemorySaveStorage()) {
  const session = new GameSession(content);
  const save = new SaveService(storage, session);
  let tile: TilePos = { x: 10, y: 14 };
  const teleports: TilePos[] = [];
  save.attachPlayer({ getTile: () => tile, teleport: (t) => teleports.push(t) });
  const statuses: SaveStatus[] = [];
  save.on('status', (s) => statuses.push(s));
  return { session, save, storage, teleports, statuses, moveTo: (t: TilePos) => (tile = t) };
}

describe('SaveService', () => {
  it('saves state and position, and load restores both', async () => {
    const { session, save, teleports, moveTo } = setup();
    session.applyEffects([{ type: 'setFlag', flag: 'restaurant_open' }]);
    expect(await save.save()).toBe(true);

    session.applyEffects([{ type: 'setFlag', flag: 'later', value: 1 }]);
    moveTo({ x: 1, y: 1 });
    expect(await save.load()).toBe(true);
    expect(session.state.flags).toEqual({ restaurant_open: true });
    expect(teleports.at(-1)).toEqual({ x: 10, y: 14 });
  });

  it('a saved game is picked up at the next start', async () => {
    const { session, save, storage } = setup();
    session.applyEffects([{ type: 'adjustFlag', flag: 'market_reputation', by: 10 }]);
    await save.save();

    const initial = await readInitialSave(storage, content);
    expect(initial.save?.state.flags.market_reputation).toBe(10);
    expect(initial.save?.player.tile).toEqual({ x: 10, y: 14 });
  });

  it('reset clears the save and returns to a fresh game at the spawn point', async () => {
    const { session, save, storage, teleports, statuses } = setup();
    session.applyEffects([{ type: 'setFlag', flag: 'x' }]);
    await save.save();
    await save.reset();
    expect(session.state).toEqual(newGameState(content));
    expect(await storage.read()).toBeNull();
    expect(teleports.at(-1)).toEqual(content.map.spawn);
    expect(statuses.at(-1)).toEqual({ kind: 'reset' });
    expect(save.lastSavedAt).toBeNull();
  });

  it('reports storage failures instead of throwing', async () => {
    const broken: SaveStorage = {
      read: async () => {
        throw new Error('Browser storage unavailable (SecurityError)');
      },
      write: async () => {
        throw new Error('Browser storage unavailable (QuotaExceededError)');
      },
      clear: async () => {},
    };
    const { save, statuses } = setup(broken);
    expect(await save.save()).toBe(false);
    expect(statuses.at(-1)).toEqual({
      kind: 'error',
      message: 'Browser storage unavailable (QuotaExceededError)',
    });
    expect(await save.load()).toBe(false);
    expect(await readInitialSave(broken, content)).toMatchObject({
      error: expect.stringMatching(/SecurityError/),
    });
  });

  it('treats a corrupted save as no save', async () => {
    const initial = await readInitialSave(new MemorySaveStorage('{"saveVersion":'), content);
    expect(initial.save).toBeUndefined();
    expect(initial.error).toMatch(/not valid JSON/);
  });

  it('starts from a provided save', () => {
    const session = new GameSession(content);
    const data = createSave(session.state, { x: 3, y: 2 });
    const save = new SaveService(new MemorySaveStorage(), session, data);
    expect(save.startTile).toEqual({ x: 3, y: 2 });
    expect(save.lastSavedAt).toBe(data.savedAt);
  });

  it('autosaves once after a burst of quest progress', async () => {
    vi.useFakeTimers();
    try {
      const { session, save, storage } = setup();
      const write = vi.spyOn(storage, 'write');
      const stop = save.enableAutosave(100);
      session.applyEffects([{ type: 'startQuest', quest: 'q_know_town' }]);
      session.handleEvent({ type: 'talk', npc: 'ken' });
      await vi.advanceTimersByTimeAsync(150);
      expect(write).toHaveBeenCalledTimes(1);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
