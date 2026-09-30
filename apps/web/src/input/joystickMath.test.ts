import { describe, expect, it } from 'vitest';
import { IDLE_INTENT, length } from '@life-shift/shared';
import { readJoystick } from './joystickMath';

const RADIUS = 50;
const DEADZONE = 0.2; // 10px

describe('readJoystick', () => {
  it('is idle at the centre and inside the deadzone', () => {
    expect(readJoystick(0, 0, RADIUS, DEADZONE).intent).toEqual(IDLE_INTENT);
    expect(readJoystick(6, 6, RADIUS, DEADZONE).intent).toEqual(IDLE_INTENT);
  });

  it('reaches full magnitude at the rim', () => {
    const { intent } = readJoystick(RADIUS, 0, RADIUS, DEADZONE);
    expect(intent.x).toBeCloseTo(1);
    expect(intent.y).toBeCloseTo(0);
  });

  it('ramps linearly between deadzone and rim', () => {
    const { intent } = readJoystick(0, 30, RADIUS, DEADZONE); // halfway between 10 and 50
    expect(intent.y).toBeCloseTo(0.5);
  });

  it('clamps the knob and the intent when dragged past the rim', () => {
    const { intent, knob } = readJoystick(-300, 400, RADIUS, DEADZONE);
    expect(length(intent)).toBeCloseTo(1);
    expect(length(knob)).toBeCloseTo(RADIUS);
    expect(knob.x).toBeCloseTo(-30);
    expect(knob.y).toBeCloseTo(40);
  });
});
