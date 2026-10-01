import type { GameContent, WorldObjectDef } from '../content/types';
import { evaluateAll } from '../state/conditions';
import type { GameState } from '../state/gameState';

/** Texture an object should show for the current world state (first matching appearance). */
export function objectTexture(
  object: WorldObjectDef,
  state: GameState,
  content: GameContent,
): string | undefined {
  return object.appearances.find((a) => evaluateAll(a.when, state, content))?.texture;
}
