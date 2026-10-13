import { TILE_SIZE } from '../constants';
import type { Vec2 } from '../math/vector';

/** How close (world units, feet to feet) the player must be to interact with something. */
export const INTERACT_RANGE = TILE_SIZE * 2;

export interface Interactable {
  readonly id: string;
  /** Feet position in world units. */
  readonly x: number;
  readonly y: number;
}

/** The nearest interactable within `range` of `from`, or undefined. Ties keep list order. */
export function findInteractionTarget<T extends Interactable>(
  from: Vec2,
  candidates: readonly T[],
  range: number = INTERACT_RANGE,
): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - from.x, c.y - from.y);
    if (d <= range && d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

/** Feet position of an entity standing on tile (xTiles, yTiles). */
export function tileFeet(xTiles: number, yTiles: number): Vec2 {
  return { x: (xTiles + 0.5) * TILE_SIZE, y: (yTiles + 1) * TILE_SIZE };
}
