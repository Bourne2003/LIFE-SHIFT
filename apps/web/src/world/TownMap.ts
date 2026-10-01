import type Phaser from 'phaser';
import {
  TILE_SIZE,
  parseMap,
  solidTileIndices,
  type MapDef,
  type TileGrid,
} from '@life-shift/shared';
import { TextureKeys } from '../game/assets';

export interface BuiltMap {
  readonly grid: TileGrid;
  /** Collides with every solid tile kind. */
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  readonly widthPx: number;
  readonly heightPx: number;
}

/** Turns map data into a Phaser tilemap layer with collision on solid tiles. */
export function buildTownMap(scene: Phaser.Scene, def: MapDef): BuiltMap {
  const grid = parseMap(def);
  const tilemap = scene.make.tilemap({
    data: grid.tiles.map((row) => [...row]),
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  });
  const tileset = tilemap.addTilesetImage(
    TextureKeys.Tiles,
    TextureKeys.Tiles,
    TILE_SIZE,
    TILE_SIZE,
  );
  if (!tileset) throw new Error('Tileset texture missing — was BootScene skipped?');
  const layer = tilemap.createLayer(0, tileset, 0, 0);
  if (!layer) throw new Error(`Could not create layer for map ${def.id}`);
  layer.setCollision(solidTileIndices());
  layer.setDepth(-1); // characters are depth-sorted by y (>= 0) above it
  return { grid, layer, widthPx: grid.width * TILE_SIZE, heightPx: grid.height * TILE_SIZE };
}
