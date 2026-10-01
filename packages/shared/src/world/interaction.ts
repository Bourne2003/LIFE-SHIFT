import { TILE_SIZE } from '../constants';
import type { Vec2 } from '../math/vector';

/** How close (world units, centre to centre) the player must be to interact with something. */
export const INTERACT_RANGE = TILE_SIZE * 1.75;

export interface Interactable {
  readonly id: string;
  readonly position: Vec2;
}

/** The closest candidate within `range` of `from`, or undefined. Ties keep list order. */
export function findNearestInRange<T extends Interactable>(
  from: Vec2,
  candidates: readonly T[],
  range: number = INTERACT_RANGE,
): T | undefined {
  let best: T | undefined;
  let bestDist = range;
  for (const c of candidates) {
    const d = Math.hypot(c.position.x - from.x, c.position.y - from.y);
    if (d <= bestDist && (best === undefined || d < bestDist)) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}
