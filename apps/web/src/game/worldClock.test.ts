import { describe, expect, it } from 'vitest';
import { environmentAt } from './worldClock';

describe('world environment clock', () => {
  it('moves through stable periods during a game day', () => {
    expect(environmentAt(0).period).toBe('morning');
    expect(environmentAt(30_000).period).toBe('day');
    expect(environmentAt(80_000).period).toBe('evening');
    expect(environmentAt(100_000).period).toBe('night');
  });

  it('cycles weather deterministically and wraps each day', () => {
    expect(environmentAt(60_000).weather).toBe('rain');
    expect(environmentAt(0).weather).toBe(environmentAt(120_000).weather);
  });

  it('normalizes invalid elapsed time', () => {
    expect(environmentAt(Number.NaN)).toEqual(environmentAt(0));
    expect(environmentAt(-1)).toEqual(environmentAt(0));
  });
});
