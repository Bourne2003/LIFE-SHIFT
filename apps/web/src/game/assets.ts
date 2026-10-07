/**
 * Texture keys used by gameplay code. Gameplay refers to these keys only, never to file paths,
 * so placeholder art generated in BootScene can later be swapped for real sprite sheets by
 * loading files under the same keys.
 */
export const TextureKeys = {
  Player: 'player',
  Ground: 'ground',
  Road: 'road',
  Building: 'building',
} as const;
