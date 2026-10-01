/**
 * Texture keys used by gameplay code. Gameplay refers to these keys only, never to file paths,
 * so placeholder art generated in BootScene can later be swapped for real sprite sheets by
 * loading files under the same keys.
 */
export const TextureKeys = {
  Player: 'player',
  /** One tile per entry of TILE_KINDS, left to right. */
  Tiles: 'tiles',
  npc: (npcId: string) => `npc:${npcId}`,
} as const;
