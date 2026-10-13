import { describe, expect, it } from 'vitest';
import { IDLE_INTENT, type MoveIntent } from '@life-shift/shared';
import { InputManager } from './InputManager';
import type { InputAction } from './InputSource';

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

  it('merges actions from all sources and drains each source', () => {
    const input = new InputManager();
    const pending = (actions: InputAction[]) => ({
      getMoveIntent: () => IDLE_INTENT,
      consumeActions: () => actions.splice(0),
    });
    input.add(pending(['interact']));
    input.add(pending(['interact', 'navDown']));
    input.add(fixed(IDLE_INTENT)); // sources without actions are fine
    expect([...input.consumeActions()].sort()).toEqual(['interact', 'navDown']);
    expect(input.consumeActions().size).toBe(0);
  });
});
