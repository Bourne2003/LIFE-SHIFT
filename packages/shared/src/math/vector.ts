export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const ZERO: Vec2 = Object.freeze({ x: 0, y: 0 });

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Scales `v` down so its length is at most `max`; shorter vectors are returned unchanged. */
export function clampLength(v: Vec2, max: number): Vec2 {
  const len = length(v);
  if (len <= max || len === 0) return v;
  const k = max / len;
  return { x: v.x * k, y: v.y * k };
}

export function scale(v: Vec2, k: number): Vec2 {
  return { x: v.x * k, y: v.y * k };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}
