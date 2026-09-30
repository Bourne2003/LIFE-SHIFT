import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '@life-shift/shared';
import { TILES_ON_SHORT_EDGE, zoomForViewport } from './viewport';

const WORLD_W = 40 * TILE_SIZE;
const WORLD_H = 30 * TILE_SIZE;

describe('zoomForViewport', () => {
  it('shows roughly the same number of tiles on phone and desktop', () => {
    for (const [w, h] of [
      [390, 844],
      [1920, 1080],
      [1024, 768],
    ] as const) {
      const zoom = zoomForViewport(w, h, WORLD_W, WORLD_H);
      const tilesVisible = Math.min(w, h) / zoom / TILE_SIZE;
      expect(tilesVisible).toBeGreaterThan(TILES_ON_SHORT_EDGE * 0.8);
      expect(tilesVisible).toBeLessThan(TILES_ON_SHORT_EDGE * 1.25);
    }
  });

  it('snaps to quarter steps', () => {
    const zoom = zoomForViewport(1000, 700, WORLD_W, WORLD_H);
    expect(zoom * 4).toBe(Math.round(zoom * 4));
  });

  it('stays within [1, 3] for normal screens', () => {
    expect(zoomForViewport(320, 480, WORLD_W, WORLD_H)).toBe(1);
    expect(zoomForViewport(3840, 2160, WORLD_W, WORLD_H)).toBe(3);
  });

  it('never shows beyond the world edges', () => {
    const zoom = zoomForViewport(5000, 400, WORLD_W, WORLD_H);
    expect(5000 / zoom).toBeLessThanOrEqual(WORLD_W);
  });

  it('survives degenerate sizes', () => {
    expect(Number.isFinite(zoomForViewport(0, 0, WORLD_W, WORLD_H))).toBe(true);
  });
});
