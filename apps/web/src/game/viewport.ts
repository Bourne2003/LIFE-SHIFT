import { TILE_SIZE } from '@life-shift/shared';

/** How many tiles should fit across the shorter screen edge. Smaller = more zoomed in. */
export const TILES_ON_SHORT_EDGE = 12;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

/**
 * Picks a camera zoom so phones and 4K monitors show a similar amount of the world.
 * Snaps to quarter steps to reduce pixel shimmer, and never zooms out so far that the view is
 * larger than the world (which would show empty space around the map).
 */
export function zoomForViewport(
  viewWidth: number,
  viewHeight: number,
  worldWidth: number,
  worldHeight: number,
): number {
  const shortEdge = Math.max(1, Math.min(viewWidth, viewHeight));
  const target = shortEdge / (TILES_ON_SHORT_EDGE * TILE_SIZE);
  const snapped = Math.round(target / ZOOM_STEP) * ZOOM_STEP;
  const fitWorld = Math.max(viewWidth / worldWidth, viewHeight / worldHeight);
  return Math.max(Math.min(Math.max(snapped, MIN_ZOOM), MAX_ZOOM), fitWorld);
}
