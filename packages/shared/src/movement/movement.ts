import { ZERO, add, clampLength, length, scale, type Vec2 } from '../math/vector';

/**
 * A device-independent request to move. Each axis is in [-1, 1] and the vector length is at most 1.
 * Keyboards produce 8-way unit intents; analog sources (touch joystick, gamepad) produce partial
 * intents for slower movement. Gameplay code only ever sees this type, never raw input.
 */
export type MoveIntent = Vec2;

export const IDLE_INTENT: MoveIntent = ZERO;

/** Below this magnitude an intent is treated as idle (filters joystick jitter). */
export const INTENT_EPSILON = 0.05;

/** Clamps an arbitrary vector into a valid MoveIntent. Non-finite components become 0. */
export function toIntent(v: Vec2): MoveIntent {
  const x = Number.isFinite(v.x) ? v.x : 0;
  const y = Number.isFinite(v.y) ? v.y : 0;
  const clamped = clampLength({ x, y }, 1);
  return length(clamped) < INTENT_EPSILON ? IDLE_INTENT : clamped;
}

/** Builds an intent from digital directions (keys / d-pad). Diagonals are normalized. */
export function intentFromDirections(dir: {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}): MoveIntent {
  const x = (dir.right ? 1 : 0) - (dir.left ? 1 : 0);
  const y = (dir.down ? 1 : 0) - (dir.up ? 1 : 0);
  if (x === 0 && y === 0) return IDLE_INTENT;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

/** Merges intents from several simultaneous sources (e.g. keyboard + joystick). */
export function combineIntents(intents: readonly MoveIntent[]): MoveIntent {
  return toIntent(intents.reduce(add, ZERO));
}

/** Converts an intent into a velocity in world units per second. */
export function intentToVelocity(intent: MoveIntent, speed: number): Vec2 {
  return scale(toIntent(intent), speed);
}

/**
 * Advances a position by `dtSeconds` without collision. Used for deterministic simulation
 * (tests, future server-side validation); the browser client delegates collision to Phaser physics.
 */
export function stepPosition(
  position: Vec2,
  intent: MoveIntent,
  speed: number,
  dtSeconds: number,
): Vec2 {
  const v = intentToVelocity(intent, speed);
  return { x: position.x + v.x * dtSeconds, y: position.y + v.y * dtSeconds };
}

export type Facing = 'up' | 'down' | 'left' | 'right';

/** Picks the dominant axis for sprite facing; keeps `previous` while idle. */
export function facingFromIntent(intent: MoveIntent, previous: Facing): Facing {
  if (intent.x === 0 && intent.y === 0) return previous;
  if (Math.abs(intent.x) > Math.abs(intent.y)) return intent.x > 0 ? 'right' : 'left';
  return intent.y > 0 ? 'down' : 'up';
}
