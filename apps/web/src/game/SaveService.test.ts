import { describe, expect, it, vi } from 'vitest';
import { INITIAL_STATE, serializeSave } from '@life-shift/shared';
import { BROKEN_SAVE_KEY, SAVE_KEY, SaveService, type KeyValueStore } from './SaveService';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe('SaveService', () => {
  it('starts with nothing loaded on a fresh device', () => {
    expect(new SaveService(memoryStore()).loaded).toBeNull();
  });

  it('writes a save that the next session loads', () => {
    const store = memoryStore();
    const state = { ...INITIAL_STATE, flags: { open: true } };
    expect(new SaveService(store).write(state, { x: 1, y: 2 })).toBe(true);
    const next = new SaveService(store);
    expect(next.loaded?.state).toEqual(state);
    expect(next.loaded?.player).toEqual({ x: 1, y: 2 });
  });

  it('moves an unreadable save aside instead of deleting it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = memoryStore({ [SAVE_KEY]: '{oops' });
    expect(new SaveService(store).loaded).toBeNull();
    expect(store.data[BROKEN_SAVE_KEY]).toBe('{oops');
    expect(store.data[SAVE_KEY]).toBeUndefined();
  });

  it('never throws when storage fails', () => {
    const failing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const service = new SaveService(failing);
    expect(service.loaded).toBeNull();
    expect(service.write(INITIAL_STATE, null)).toBe(false);
    expect(() => service.clear()).not.toThrow();
    expect(new SaveService(null).write(INITIAL_STATE, null)).toBe(false);
  });

  it('clears the save', () => {
    const store = memoryStore({ [SAVE_KEY]: serializeSave(INITIAL_STATE, null) });
    new SaveService(store).clear();
    expect(store.data[SAVE_KEY]).toBeUndefined();
  });
});
