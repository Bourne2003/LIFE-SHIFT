import { describe, expect, it } from 'vitest';
import {
  loadWorldMemory,
  saveWorldMemory,
  WORLD_MEMORY_KEY,
  WORLD_MEMORY_VERSION,
} from './worldMemory';

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('world memory', () => {
  it('round-trips a versioned save', () => {
    const target = storage();
    const memory = {
      version: WORLD_MEMORY_VERSION,
      questState: 'complete',
      discoveredLandmarks: ['old-fountain'],
      player: { x: 100, y: 200 },
    } as const;

    expect(saveWorldMemory(memory, target)).toBe(true);
    expect(loadWorldMemory(target)).toEqual(memory);
  });

  it('rejects corrupted or incompatible saves', () => {
    const target = storage();
    target.values.set(WORLD_MEMORY_KEY, JSON.stringify({ version: 99 }));
    expect(loadWorldMemory(target)).toBeUndefined();
    target.values.set(WORLD_MEMORY_KEY, '{broken');
    expect(loadWorldMemory(target)).toBeUndefined();
  });
});
