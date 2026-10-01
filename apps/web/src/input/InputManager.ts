import { combineIntents, type MoveIntent } from '@life-shift/shared';
import type { InputSource } from './InputSource';

/** Discrete, device-independent commands (as opposed to continuous movement). */
export type GameAction = 'interact' | 'cancel';

/**
 * Merges every active input device into one intent and one action queue. Gameplay reads only
 * from here, so adding a device means registering a source and/or calling press() — no gameplay
 * code changes.
 */
export class InputManager {
  private readonly sources = new Set<InputSource>();
  private readonly pressed = new Set<GameAction>();

  /** Registers a source and returns a function that unregisters it. */
  add(source: InputSource): () => void {
    this.sources.add(source);
    return () => this.sources.delete(source);
  }

  getMoveIntent(): MoveIntent {
    return combineIntents([...this.sources].map((s) => s.getMoveIntent()));
  }

  /** Called by devices (key down, button tap) when an action is triggered. */
  press(action: GameAction): void {
    this.pressed.add(action);
  }

  /** True once per press: the first caller in a frame gets it. */
  consume(action: GameAction): boolean {
    return this.pressed.delete(action);
  }

  /** Drops presses nobody consumed this frame, so they cannot fire later by surprise. */
  endFrame(): void {
    this.pressed.clear();
  }
}
