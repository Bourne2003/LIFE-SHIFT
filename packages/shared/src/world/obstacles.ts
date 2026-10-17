export interface WorldObstacleRect {
  readonly xTiles: number;
  readonly yTiles: number;
  readonly widthTiles: number;
  readonly heightTiles: number;
}

export const WORLD_OBSTACLES: readonly WorldObstacleRect[] = [
  { xTiles: 4, yTiles: 4, widthTiles: 6, heightTiles: 3 },
  { xTiles: 30, yTiles: 5, widthTiles: 5, heightTiles: 4 },
  { xTiles: 26, yTiles: 14, widthTiles: 3, heightTiles: 3 },
  { xTiles: 6, yTiles: 22, widthTiles: 8, heightTiles: 3 },
  { xTiles: 28, yTiles: 21, widthTiles: 7, heightTiles: 4 },
  // Walls that hide the alley behind the curry shop; the way in is the gap at the bottom.
  { xTiles: 35, yTiles: 25, widthTiles: 1, heightTiles: 4 },
  { xTiles: 36, yTiles: 25, widthTiles: 4, heightTiles: 1 },
] as const;
