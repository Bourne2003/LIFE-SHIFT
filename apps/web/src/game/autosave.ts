import type { GameClock, Vec2 } from '@life-shift/shared';
import type { SaveService } from './SaveService';
import type { GameSession } from './session';

/** How often position and world time are saved while playing. */
const POSITION_INTERVAL_MS = 5000;

/**
 * Saves whenever the game state changes, every few seconds while the player has moved or world
 * time has passed, and when the page is hidden or closed (the last chance on mobile). Returns a function that stops it.
 */
export function startAutosave(
  session: GameSession,
  save: SaveService,
  playerFeet: () => Vec2,
): () => void {
  let lastSaved: { at: Vec2; clock: GameClock } | null = null;
  const write = () => {
    const feet = playerFeet();
    const at = { x: Math.round(feet.x), y: Math.round(feet.y) };
    const { clock } = session.state;
    if (save.write(session.state, at)) lastSaved = { at, clock };
  };
  const writeIfChanged = () => {
    const feet = playerFeet();
    const moved = !lastSaved || Math.hypot(feet.x - lastSaved.at.x, feet.y - lastSaved.at.y) >= 1;
    if (moved || session.state.clock !== lastSaved?.clock) write();
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') write();
  };

  const offSession = session.on((e) => {
    if (e.type === 'stateChanged') write();
  });
  const timer = window.setInterval(writeIfChanged, POSITION_INTERVAL_MS);
  window.addEventListener('pagehide', write);
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    offSession();
    window.clearInterval(timer);
    window.removeEventListener('pagehide', write);
    document.removeEventListener('visibilitychange', onHidden);
  };
}
