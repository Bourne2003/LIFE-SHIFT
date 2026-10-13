import { combineIntents, type MoveIntent } from '@life-shift/shared';
import type { InputAction, InputSource } from './InputSource';

/**
 * Merges every active input device into one intent. Gameplay reads only from here, so adding a
 * device means registering a new InputSource — no gameplay code changes.
 */
export class InputManager {
  private readonly sources = new Set<InputSource>();

  /** Registers a source and returns a function that unregisters it. */
  add(source: InputSource): () => void {
    this.sources.add(source);
    return () => this.sources.delete(source);
  }

  getMoveIntent(): MoveIntent {
    return combineIntents([...this.sources].map((s) => s.getMoveIntent()));
  }

  /** Actions pressed on any device since the last call. Call once per frame. */
  consumeActions(): ReadonlySet<InputAction> {
    const actions = new Set<InputAction>();
    // Ask every source, so each one clears its pending presses.
    for (const source of this.sources)
      for (const a of source.consumeActions?.() ?? []) actions.add(a);
    return actions;
  }
}
