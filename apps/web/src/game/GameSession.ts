import {
  applyEffects,
  createInitialState,
  handleQuestEvent,
  type Effect,
  type GameContent,
  type GameState,
  type Outcome,
  type QuestEvent,
  type QuestNotice,
} from '@life-shift/shared';
import { Emitter } from './events';

export interface SessionEvents {
  /** Fired after every change to the game state. */
  state: GameState;
  /** Fired for every quest notice, in order. */
  notice: QuestNotice;
}

/**
 * Owns the local player's GameState and is the only place it changes. Gameplay asks for
 * changes (effects, quest events) instead of editing state, which is the same shape a future
 * server-authoritative session will have: request in, validated state + notices out.
 */
export class GameSession extends Emitter<SessionEvents> {
  private _state: GameState;

  constructor(
    readonly content: GameContent,
    initial: GameState = createInitialState(),
  ) {
    super();
    this._state = initial;
  }

  get state(): GameState {
    return this._state;
  }

  applyEffects(effects: readonly Effect[]): void {
    this.commit(applyEffects(this._state, this.content, effects));
  }

  questEvent(event: QuestEvent): void {
    this.commit(handleQuestEvent(this._state, this.content, event));
  }

  private commit(outcome: Outcome): void {
    if (outcome.state === this._state && outcome.notices.length === 0) return;
    this._state = outcome.state;
    this.emit('state', this._state);
    for (const notice of outcome.notices) this.emit('notice', notice);
  }
}
