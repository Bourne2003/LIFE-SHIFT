import type { GameContent, NpcDef, TilePos, TimePeriod } from '../content/types';
import { evaluateAll } from '../state/conditions';
import type { GameState } from '../state/gameState';

/**
 * Where an NPC should be right now: the first schedule entry for this time of day whose
 * conditions hold, else their default position. Without a game clock (`period` undefined) only
 * `any` entries apply.
 */
export function npcPosition(
  npc: NpcDef,
  state: GameState,
  content: GameContent,
  period?: TimePeriod,
): TilePos {
  const entry = npc.schedule.find(
    (s) => (s.period === 'any' || s.period === period) && evaluateAll(s.when, state, content),
  );
  return entry?.position ?? npc.position;
}
