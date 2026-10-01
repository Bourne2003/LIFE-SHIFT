import { describe, expect, it } from 'vitest';
import { IDLE_INTENT, type MoveIntent } from '@life-shift/shared';
import { InputManager } from './InputManager';

const fixed = (intent: MoveIntent) => ({ getMoveIntent: () => intent });

describe('InputManager', () => {
  it('is idle with no sources', () => {
    expect(new InputManager().getMoveIntent()).toEqual(IDLE_INTENT);
  });

  it('combines all registered sources', () => {
    const input = new InputManager();
    input.add(fixed({ x: 1, y: 0 }));
    input.add(fixed({ x: 0, y: 0.5 }));
    expect(input.getMoveIntent().x).toBeGreaterThan(0);
    expect(input.getMoveIntent().y).toBeGreaterThan(0);
  });

  it('stops reading a source once removed', () => {
    const input = new InputManager();
    const remove = input.add(fixed({ x: -1, y: 0 }));
    remove();
    expect(input.getMoveIntent()).toEqual(IDLE_INTENT);
  });
});

describe('InputManager actions', () => {
  it('delivers each press once', () => {
    const input = new InputManager();
    input.press('interact');
    expect(input.consume('interact')).toBe(true);
    expect(input.consume('interact')).toBe(false);
  });

  it('drops unconsumed presses at the end of the frame', () => {
    const input = new InputManager();
    input.press('cancel');
    input.endFrame();
    expect(input.consume('cancel')).toBe(false);
  });
});
