import { describe, expect, it } from 'vitest';
import {
  IDLE_INTENT,
  combineIntents,
  facingFromIntent,
  intentFromDirections,
  intentToVelocity,
  length,
  stepPosition,
  toIntent,
} from '../src';

const none = { up: false, down: false, left: false, right: false };

describe('intentFromDirections', () => {
  it('is idle with no keys held', () => {
    expect(intentFromDirections(none)).toEqual(IDLE_INTENT);
  });

  it('is idle when opposite keys cancel out', () => {
    expect(intentFromDirections({ ...none, left: true, right: true })).toEqual(IDLE_INTENT);
  });

  it('produces unit cardinal intents (screen y points down)', () => {
    expect(intentFromDirections({ ...none, right: true })).toEqual({ x: 1, y: 0 });
    expect(intentFromDirections({ ...none, up: true })).toEqual({ x: 0, y: -1 });
  });

  it('normalizes diagonals so they are not faster than cardinals', () => {
    const diag = intentFromDirections({ ...none, down: true, right: true });
    expect(length(diag)).toBeCloseTo(1);
    expect(diag.x).toBeCloseTo(Math.SQRT1_2);
    expect(diag.y).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('toIntent', () => {
  it('clamps long vectors to length 1', () => {
    expect(length(toIntent({ x: 3, y: 4 }))).toBeCloseTo(1);
  });

  it('keeps partial analog intents', () => {
    expect(toIntent({ x: 0.5, y: 0 })).toEqual({ x: 0.5, y: 0 });
  });

  it('treats tiny intents and non-finite input as idle', () => {
    expect(toIntent({ x: 0.01, y: 0.01 })).toEqual(IDLE_INTENT);
    expect(toIntent({ x: Number.NaN, y: Infinity })).toEqual(IDLE_INTENT);
  });
});

describe('combineIntents', () => {
  it('sums sources and clamps the result', () => {
    const combined = combineIntents([
      { x: 1, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(combined).toEqual({ x: 1, y: 0 });
  });

  it('is idle for no sources', () => {
    expect(combineIntents([])).toEqual(IDLE_INTENT);
  });
});

describe('velocity and stepping', () => {
  it('scales intent by speed', () => {
    expect(intentToVelocity({ x: 1, y: 0 }, 180)).toEqual({ x: 180, y: 0 });
  });

  it('never exceeds speed even for invalid intents', () => {
    expect(length(intentToVelocity({ x: 5, y: 5 }, 100))).toBeCloseTo(100);
  });

  it('advances position by velocity * dt', () => {
    const next = stepPosition({ x: 10, y: 10 }, { x: 0, y: 1 }, 100, 0.5);
    expect(next).toEqual({ x: 10, y: 60 });
  });
});

describe('facingFromIntent', () => {
  it('keeps previous facing while idle', () => {
    expect(facingFromIntent(IDLE_INTENT, 'left')).toBe('left');
  });

  it('uses the dominant axis', () => {
    expect(facingFromIntent({ x: 0.9, y: 0.2 }, 'down')).toBe('right');
    expect(facingFromIntent({ x: -0.1, y: -0.8 }, 'down')).toBe('up');
  });
});
