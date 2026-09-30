import { IDLE_INTENT, type MoveIntent, type Vec2 } from '@life-shift/shared';

export interface JoystickReading {
  readonly intent: MoveIntent;
  /** Knob offset from the base centre, clamped to the base radius (for drawing). */
  readonly knob: Vec2;
}

/**
 * Converts a drag offset from the joystick centre into an analog intent.
 * Inside `deadzone * radius` the stick is idle; beyond that, magnitude ramps linearly to 1 at `radius`.
 */
export function readJoystick(
  dx: number,
  dy: number,
  radius: number,
  deadzone: number,
): JoystickReading {
  const dist = Math.hypot(dx, dy);
  const clampedDist = Math.min(dist, radius);
  const knob =
    dist === 0 ? { x: 0, y: 0 } : { x: (dx / dist) * clampedDist, y: (dy / dist) * clampedDist };

  const dead = deadzone * radius;
  if (dist <= dead || radius <= dead) return { intent: IDLE_INTENT, knob };

  const magnitude = (clampedDist - dead) / (radius - dead);
  return { intent: { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude }, knob };
}
