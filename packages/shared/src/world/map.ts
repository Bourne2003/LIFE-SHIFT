import { TILE_SIZE } from '../constants';
import type { LocationDef, MapDef, TileArea, TilePos } from '../content/types';
import type { Vec2 } from '../math/vector';

export interface TileKind {
  readonly id: string;
  readonly solid: boolean;
}

/**
 * Every tile kind the world can contain. The array index is the tile index used by renderers,
 * so append new kinds at the end. Whether a tile blocks movement is gameplay data and lives
 * here (shared with the future server); how it looks is up to the client.
 */
export const TILE_KINDS: readonly TileKind[] = [
  { id: 'grass', solid: false },
  { id: 'road', solid: false },
  { id: 'path', solid: false },
  { id: 'plaza', solid: false },
  { id: 'flowers', solid: false },
  { id: 'water', solid: true },
  { id: 'tree', solid: true },
  { id: 'hedge', solid: true },
  { id: 'building', solid: true },
  { id: 'door', solid: true },
  { id: 'stall', solid: true },
  { id: 'tower', solid: true },
  { id: 'fountain', solid: true },
];

const KIND_INDEX = new Map(TILE_KINDS.map((k, i) => [k.id, i]));

export interface TileGrid {
  readonly width: number;
  readonly height: number;
  /** tiles[y][x] = index into TILE_KINDS */
  readonly tiles: readonly (readonly number[])[];
}

/** Converts a map's character rows into tile indices. Throws on malformed data. */
export function parseMap(map: MapDef): TileGrid {
  const height = map.rows.length;
  const width = map.rows[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error(`Map ${map.id} is empty`);

  const tiles = map.rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Map ${map.id} row ${y} has ${row.length} tiles, expected ${width}`);
    }
    return [...row].map((char, x) => {
      const kind = map.legend[char];
      const index = kind === undefined ? undefined : KIND_INDEX.get(kind);
      if (index === undefined) {
        throw new Error(`Map ${map.id} has unknown tile '${char}' at ${x},${y}`);
      }
      return index;
    });
  });
  return { width, height, tiles };
}

export function tileKindAt(grid: TileGrid, tile: TilePos): TileKind | undefined {
  const index = grid.tiles[tile.y]?.[tile.x];
  return index === undefined ? undefined : TILE_KINDS[index];
}

/** Out-of-bounds tiles count as solid. */
export function isSolid(grid: TileGrid, tile: TilePos): boolean {
  return tileKindAt(grid, tile)?.solid ?? true;
}

export function solidTileIndices(): number[] {
  return TILE_KINDS.flatMap((k, i) => (k.solid ? [i] : []));
}

export function worldToTile(point: Vec2): TilePos {
  return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
}

export function tileCenter(tile: TilePos): Vec2 {
  return { x: (tile.x + 0.5) * TILE_SIZE, y: (tile.y + 0.5) * TILE_SIZE };
}

export function areaContains(area: TileArea, tile: TilePos): boolean {
  return (
    tile.x >= area.x &&
    tile.y >= area.y &&
    tile.x < area.x + area.width &&
    tile.y < area.y + area.height
  );
}

/** Locations containing `tile`, most specific (smallest) first. */
export function locationsAt(locations: readonly LocationDef[], tile: TilePos): LocationDef[] {
  return locations
    .filter((l) => areaContains(l.area, tile))
    .sort((a, b) => a.area.width * a.area.height - b.area.width * b.area.height);
}
