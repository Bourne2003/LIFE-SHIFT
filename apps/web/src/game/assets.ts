/**
 * Texture keys used by gameplay code. Gameplay refers to these keys only, never to file paths,
 * so placeholder art generated in BootScene can later be swapped for real sprite sheets by
 * loading files under the same keys.
 */
export const TextureKeys = {
  Player: 'player',
  Npc: 'npc',
  Ground: 'ground',
  Road: 'road',
  Building: 'building',
  NoodleStall: 'noodle-stall',
  Lantern: 'lantern',
  ClockFace: 'clock-face',
  Cat: 'cat',
  ParkGround: 'park-ground',
  MarketGround: 'market-ground',
  AlleyGround: 'alley-ground',
  LightGlow: 'light-glow',
} as const;
