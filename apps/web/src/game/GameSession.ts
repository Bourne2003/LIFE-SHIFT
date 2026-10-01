import {
  applyEffects,
  buy,
  handleGameEvent,
  newGameState,
  sell,
  type Effect,
  type GameContent,
  type GameEvent,
  type GameState,
  type GameNotice,
  type Outcome,
  type TradeResult,
} from '@life-shift/shared';
import { Emitter } from './events';

export interface SessionEvents {
  /** Fired after every change to the game state. */
  state: GameState;
  /** Fired for every notice (quests, items, money), in order. */
  notice: GameNotice;
}

/**
 * Owns the local player's GameState and is the only place it changes. Gameplay asks for
 * changes (effects, player events) instead of editing state, which is the same shape a future
 * server-authoritative session will have: request in, validated state + notices out.
 */
export class GameSession extends Emitter<SessionEvents> {
  private _state: GameState;

  constructor(
    readonly content: GameContent,
    initial: GameState = newGameState(content),
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

  /** Reports something the player did (talked to someone, reached a place). */
  handleEvent(event: GameEvent): void {
    this.commit(handleGameEvent(this._state, this.content, event));
  }

  /** Buys from a shop. The shared rules decide; a refusal changes nothing. */
  buy(shop: string, item: string, quantity: number): TradeResult {
    return this.trade(buy(this._state, this.content, shop, item, quantity));
  }

  sell(shop: string, item: string, quantity: number): TradeResult {
    return this.trade(sell(this._state, this.content, shop, item, quantity));
  }

  /** Swaps in a whole new state (load game, new game). Emits `state` but no notices. */
  replaceState(state: GameState): void {
    this._state = state;
    this.emit('state', this._state);
  }

  private trade(result: TradeResult): TradeResult {
    if (result.ok) this.commit(result);
    return result;
  }

  private commit(outcome: Outcome): void {
    if (outcome.state === this._state && outcome.notices.length === 0) return;
    this._state = outcome.state;
    this.emit('state', this._state);
    for (const notice of outcome.notices) this.emit('notice', notice);
  }
}
