import type { GameContent, ItemDef, ShopDef } from '../content/types';
import { addItem, countItem, removeItem } from '../inventory/inventory';
import { evaluateAll } from '../state/conditions';
import type { GameState } from '../state/gameState';
import type { GameNotice } from '../state/notices';

/** Largest quantity one trade may move; guards against absurd or malicious requests. */
export const MAX_TRADE_QUANTITY = 99;

export type TradeFailure =
  | 'unknown_shop'
  | 'unknown_item'
  | 'shop_closed'
  | 'not_for_sale'
  | 'invalid_quantity'
  | 'not_enough_money'
  | 'bag_full'
  | 'not_enough_items'
  | 'shop_wont_buy';

export interface TradeReceipt {
  readonly shop: string;
  readonly item: string;
  readonly quantity: number;
  /** Money paid (buy) or received (sell). */
  readonly total: number;
}

export type TradeResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly notices: readonly GameNotice[];
      readonly receipt: TradeReceipt;
    }
  | { readonly ok: false; readonly reason: TradeFailure };

export function isShopOpen(shop: ShopDef, state: GameState, content: GameContent): boolean {
  return evaluateAll(shop.when, state, content);
}

/** What the player pays per unit, or undefined if the shop does not sell it. */
export function buyPrice(shop: ShopDef, item: ItemDef): number | undefined {
  const entry = shop.stock.find((s) => s.item === item.id);
  return entry ? (entry.price ?? item.price) : undefined;
}

/** What the shop pays per unit, or undefined if it won't buy it. */
export function sellPrice(shop: ShopDef, item: ItemDef): number | undefined {
  if (!item.sellable || !shop.buys.includes(item.category)) return undefined;
  return Math.floor(item.price * shop.buybackRate);
}

/**
 * The player buys from a shop. Every rule is checked here — never in the UI — so the same
 * function can later run on the server as the authority over money and items.
 */
export function buy(
  state: GameState,
  content: GameContent,
  shopId: string,
  itemId: string,
  quantity: number,
): TradeResult {
  const checked = check(state, content, shopId, itemId, quantity);
  if (!checked.ok) return checked;
  const { shop, item } = checked;

  const unit = buyPrice(shop, item);
  if (unit === undefined) return fail('not_for_sale');
  const total = unit * quantity;
  if (state.money < total) return fail('not_enough_money');

  const added = addItem(state, content, item.id, quantity);
  if (added.leftover > 0) return fail('bag_full');

  return {
    ok: true,
    state: { ...added.state, money: state.money - total },
    notices: [
      { type: 'itemsReceived', item: item.id, quantity },
      { type: 'moneyChanged', amount: -total },
    ],
    receipt: { shop: shop.id, item: item.id, quantity, total },
  };
}

/** The player sells to a shop. */
export function sell(
  state: GameState,
  content: GameContent,
  shopId: string,
  itemId: string,
  quantity: number,
): TradeResult {
  const checked = check(state, content, shopId, itemId, quantity);
  if (!checked.ok) return checked;
  const { shop, item } = checked;

  const unit = sellPrice(shop, item);
  if (unit === undefined) return fail('shop_wont_buy');
  if (countItem(state, item.id) < quantity) return fail('not_enough_items');

  const total = unit * quantity;
  const removed = removeItem(state, item.id, quantity).state;
  return {
    ok: true,
    state: { ...removed, money: state.money + total },
    notices: [
      { type: 'itemsRemoved', item: item.id, quantity },
      { type: 'moneyChanged', amount: total },
    ],
    receipt: { shop: shop.id, item: item.id, quantity, total },
  };
}

function check(
  state: GameState,
  content: GameContent,
  shopId: string,
  itemId: string,
  quantity: number,
):
  | { readonly ok: true; readonly shop: ShopDef; readonly item: ItemDef }
  | { readonly ok: false; readonly reason: TradeFailure } {
  const shop = content.shops[shopId];
  if (!shop) return fail('unknown_shop');
  const item = content.items[itemId];
  if (!item) return fail('unknown_item');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TRADE_QUANTITY) {
    return fail('invalid_quantity');
  }
  if (!isShopOpen(shop, state, content)) return fail('shop_closed');
  return { ok: true, shop, item };
}

function fail(reason: TradeFailure): { readonly ok: false; readonly reason: TradeFailure } {
  return { ok: false, reason };
}
