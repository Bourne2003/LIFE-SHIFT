export interface WorldNpcSpawn {
  readonly id: string;
  readonly name: string;
  readonly xTiles: number;
  readonly yTiles: number;
}

export const WORLD_NPC_SPAWNS: readonly WorldNpcSpawn[] = [
  { id: 'alex', name: 'Alex', xTiles: 12, yTiles: 10 },
  { id: 'mina', name: 'Mina', xTiles: 18, yTiles: 8 },
  { id: 'somchai', name: 'Somchai', xTiles: 23, yTiles: 18 },
  { id: 'nida', name: 'Nida', xTiles: 32, yTiles: 12 },
  { id: 'pim', name: 'Pim', xTiles: 10, yTiles: 24 },
] as const;
