import { TILE_SIZE } from '../constants';
import type { LocalizedText } from '../i18n/locale';
import type { Vec2 } from '../math/vector';

/** A named area of the city. Entering one shows its name; the first visit is remembered. */
export interface LocationDef {
  readonly id: string;
  readonly name: LocalizedText;
  /** Area in tiles (top-left and size). */
  readonly xTiles: number;
  readonly yTiles: number;
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** Ground style drawn under the area, if any. */
  readonly ground?: 'park' | 'market' | 'alley';
  /** Not shown on a map and announced as a discovery on the first visit. */
  readonly secret?: boolean;
}

/** World flag set the first time the player enters a location. */
export function visitedFlag(locationId: string): string {
  return `visited:${locationId}`;
}

/** The location containing a world-space point (the smallest one if areas nest). */
export function locationAt(
  point: Vec2,
  locations: readonly LocationDef[],
): LocationDef | undefined {
  const tx = point.x / TILE_SIZE;
  const ty = point.y / TILE_SIZE;
  let best: LocationDef | undefined;
  for (const l of locations) {
    const inside =
      tx >= l.xTiles &&
      tx < l.xTiles + l.widthTiles &&
      ty >= l.yTiles &&
      ty < l.yTiles + l.heightTiles;
    if (inside && (!best || l.widthTiles * l.heightTiles < best.widthTiles * best.heightTiles))
      best = l;
  }
  return best;
}
