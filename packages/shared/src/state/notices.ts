import type { GameState } from './gameState';

/**
 * Player-facing news produced by a state change (toasts, logs, autosave triggers, and later
 * messages from the server to clients).
 */
export type GameNotice =
  | { readonly type: 'questStarted'; readonly quest: string }
  | { readonly type: 'objectiveCompleted'; readonly quest: string; readonly objective: string }
  | { readonly type: 'questCompleted'; readonly quest: string }
  | { readonly type: 'questFailed'; readonly quest: string }
  | { readonly type: 'itemsReceived'; readonly item: string; readonly quantity: number }
  | { readonly type: 'itemsRemoved'; readonly item: string; readonly quantity: number }
  /** Items that could not be received because the bag is full. */
  | { readonly type: 'bagFull'; readonly item: string; readonly quantity: number }
  | { readonly type: 'moneyChanged'; readonly amount: number };

export interface Outcome {
  readonly state: GameState;
  readonly notices: readonly GameNotice[];
}

export function mergeOutcomes(previous: Outcome, next: Outcome): Outcome {
  return { state: next.state, notices: [...previous.notices, ...next.notices] };
}
