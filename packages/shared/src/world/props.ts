import { allHold, type GameState, type StoryCondition } from '../state/gameState';

/**
 * A decorative object placed in the world, optionally only while conditions hold. This is how
 * story progress becomes visible in the city (a stall opens, a sign appears...).
 */
export interface WorldPropDef {
  readonly id: string;
  /** Art key; the client maps it to a texture. */
  readonly kind: 'noodle-stall' | 'lantern' | 'clock-face';
  /** Top-left tile and size in tiles. */
  readonly xTiles: number;
  readonly yTiles: number;
  readonly widthTiles: number;
  readonly heightTiles: number;
  readonly when?: readonly StoryCondition[];
  /** Mounted on a building (e.g. a clock face), so it may overlap an obstacle. */
  readonly onBuilding?: boolean;
}

export function isPropVisible(prop: WorldPropDef, state: GameState): boolean {
  return allHold(state, prop.when);
}
