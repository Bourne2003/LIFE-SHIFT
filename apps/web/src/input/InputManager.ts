import { combineIntents, type MoveIntent } from '@life-shift/shared';
import type { InputSource } from './InputSource';
import type { ActionInputSource } from './ActionInputSource';

/**
 * Merges every active input device into one intent. Gameplay reads only from here, so adding a
 * device means registering a new InputSource — no gameplay code changes.
 */
export class InputManager {
  private readonly sources = new Set<InputSource>();
  private readonly actionSources = new Set<ActionInputSource>();
  private pendingInteract = false;

  /** Registers a source and returns a function that unregisters it. */
  add(source: InputSource): () => void {
    this.sources.add(source);
    return () => this.sources.delete(source);
  }

  getMoveIntent(): MoveIntent {
    return combineIntents([...this.sources].map((s) => s.getMoveIntent()));
  }

  addActionSource(source: ActionInputSource): () => void {
    this.actionSources.add(source);
    return () => this.actionSources.delete(source);
  }

  wasInteractPressed(): boolean {
    const pressed =
      this.pendingInteract || [...this.actionSources].some((source) => source.wasInteractPressed());
    this.pendingInteract = false;
    return pressed;
  }

  /** Queues one interaction from a touch or accessible UI control. */
  requestInteract(): void {
    this.pendingInteract = true;
  }
}
