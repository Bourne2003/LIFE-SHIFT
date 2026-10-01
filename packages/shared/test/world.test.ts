import { describe, expect, it } from 'vitest';
import {
  TILE_KINDS,
  TILE_SIZE,
  findNearestInRange,
  isSolid,
  locationsAt,
  parseMap,
  solidTileIndices,
  tileCenter,
  worldToTile,
} from '../src';
import { content } from './fixtures';

describe('parseMap', () => {
  const grid = parseMap(content.map);

  it('reads dimensions and tile kinds', () => {
    expect(grid.width).toBe(4);
    expect(grid.height).toBe(3);
    expect(TILE_KINDS[grid.tiles[1]![1]!]!.id).toBe('building');
  });

  it('knows which tiles block movement, treating out of bounds as solid', () => {
    expect(isSolid(grid, { x: 0, y: 0 })).toBe(false);
    expect(isSolid(grid, { x: 1, y: 1 })).toBe(true);
    expect(isSolid(grid, { x: 2, y: 2 })).toBe(true); // water
    expect(isSolid(grid, { x: -1, y: 0 })).toBe(true);
    expect(isSolid(grid, { x: 4, y: 0 })).toBe(true);
  });

  it('rejects ragged rows and unknown characters', () => {
    expect(() => parseMap({ ...content.map, rows: ['...', '..'] })).toThrow(/row 1/);
    expect(() => parseMap({ ...content.map, rows: ['.?.'] })).toThrow(/unknown tile '\?'/);
  });

  it('lists solid tile indices for the renderer', () => {
    const solid = solidTileIndices().map((i) => TILE_KINDS[i]!.id);
    expect(solid).toContain('building');
    expect(solid).not.toContain('grass');
  });
});

describe('coordinates and locations', () => {
  it('round-trips world and tile coordinates', () => {
    expect(worldToTile({ x: TILE_SIZE * 2 + 1, y: TILE_SIZE - 1 })).toEqual({ x: 2, y: 0 });
    expect(worldToTile(tileCenter({ x: 5, y: 7 }))).toEqual({ x: 5, y: 7 });
  });

  it('returns containing locations, most specific first', () => {
    expect(locationsAt(content.map.locations, { x: 2, y: 2 }).map((l) => l.id)).toEqual([
      'pond',
      'town',
    ]);
    expect(locationsAt(content.map.locations, { x: 9, y: 9 })).toEqual([]);
  });
});

describe('findNearestInRange', () => {
  const things = [
    { id: 'far', position: { x: 100, y: 0 } },
    { id: 'near', position: { x: 10, y: 0 } },
    { id: 'tie', position: { x: -10, y: 0 } },
  ];

  it('picks the closest candidate in range, keeping list order on ties', () => {
    expect(findNearestInRange({ x: 0, y: 0 }, things, 50)?.id).toBe('near');
  });

  it('returns undefined when nothing is in range', () => {
    expect(findNearestInRange({ x: 0, y: 0 }, things, 5)).toBeUndefined();
  });
});
