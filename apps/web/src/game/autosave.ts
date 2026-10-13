import type { Vec2 } from '@life-shift/shared';
import type { SaveService } from './SaveService';
import type { GameSession } from './session';

/** How often the player's position is saved while walking around. */
const POSITION_INTERVAL_MS = 5000;

/**
 * Saves whenever the game state changes, every few seconds while the player has moved, and when
 * the page is hidden or closed (the last chance on mobile). Returns a function that stops it.
 */
export function startAutosave(
  session: GameSession,
  save: SaveService,
  playerFeet: () => Vec2,
): () => void {
  let lastSaved: Vec2 | null = null;
  const write = () => {
    const at = playerFeet();
    const position = { x: Math.round(at.x), y: Math.round(at.y) };
    if (save.write(session.state, position)) lastSaved = position;
  };
  const writeIfMoved = () => {
    const at = playerFeet();
    if (!lastSaved || Math.hypot(at.x - lastSaved.x, at.y - lastSaved.y) >= 1) write();
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') write();
  };

  const offSession = session.on((e) => {
    if (e.type === 'stateChanged') write();
  });
  const timer = window.setInterval(writeIfMoved, POSITION_INTERVAL_MS);
  window.addEventListener('pagehide', write);
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    offSession();
    window.clearInterval(timer);
    window.removeEventListener('pagehide', write);
    document.removeEventListener('visibilitychange', onHidden);
  };
}
