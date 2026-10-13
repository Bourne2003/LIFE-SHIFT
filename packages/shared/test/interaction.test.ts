import { describe, expect, it } from 'vitest';
import { INTERACT_RANGE, TILE_SIZE, findInteractionTarget, tileFeet } from '../src';

describe('findInteractionTarget', () => {
  const npcs = [
    { id: 'far', x: 500, y: 0 },
    { id: 'near', x: 30, y: 0 },
    { id: 'edge', x: 0, y: INTERACT_RANGE },
  ];

  it('picks the nearest candidate in range', () => {
    expect(findInteractionTarget({ x: 0, y: 0 }, npcs)?.id).toBe('near');
  });

  it('includes a candidate exactly at the range', () => {
    expect(findInteractionTarget({ x: 0, y: 0 }, [npcs[2]!])?.id).toBe('edge');
  });

  it('returns undefined when nothing is in range', () => {
    expect(findInteractionTarget({ x: 0, y: 0 }, [npcs[0]!])).toBeUndefined();
    expect(findInteractionTarget({ x: 0, y: 0 }, [])).toBeUndefined();
  });
});

describe('tileFeet', () => {
  it('is the bottom centre of the tile', () => {
    expect(tileFeet(2, 3)).toEqual({ x: 2.5 * TILE_SIZE, y: 4 * TILE_SIZE });
  });
});
