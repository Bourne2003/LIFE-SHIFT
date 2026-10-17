import type { LocalizedText } from '../i18n/locale';
import { changeItem } from '../items/items';
import type { GameState } from '../state/gameState';

export interface ShopDef {
  readonly id: string;
  readonly name: LocalizedText;
  /** What the shop sells and for how much (baht, positive integer). */
  readonly stock: readonly { readonly item: string; readonly price: number }[];
}

export type ShopCatalog = Readonly<Record<string, ShopDef>>;

export type PurchaseResult =
  | { readonly ok: true; readonly state: GameState; readonly price: number }
  | { readonly ok: false; readonly reason: 'not-for-sale' | 'not-enough-money' };

/**
 * Buys one of `itemId` from `shop`. Pure and all-or-nothing, so the same rule can later run on
 * the server, which will own money and items.
 */
export function buyItem(state: GameState, shop: ShopDef, itemId: string): PurchaseResult {
  const entry = shop.stock.find((s) => s.item === itemId);
  if (!entry) return { ok: false, reason: 'not-for-sale' };
  if (state.money < entry.price) return { ok: false, reason: 'not-enough-money' };
  return {
    ok: true,
    price: entry.price,
    state: {
      ...state,
      money: state.money - entry.price,
      inventory: changeItem(state.inventory, itemId, 1),
    },
  };
}

/** Shops buy back at half their own price, rounded down: selling never makes a profit. */
export function sellPrice(shop: ShopDef, itemId: string): number | undefined {
  const entry = shop.stock.find((s) => s.item === itemId);
  return entry ? Math.floor(entry.price / 2) : undefined;
}

export type SaleResult =
  | { readonly ok: true; readonly state: GameState; readonly price: number }
  | { readonly ok: false; readonly reason: 'not-wanted' | 'not-owned' };

/** Sells one of `itemId` to `shop`. A shop only buys what it sells itself. */
export function sellItem(state: GameState, shop: ShopDef, itemId: string): SaleResult {
  const price = sellPrice(shop, itemId);
  if (price === undefined) return { ok: false, reason: 'not-wanted' };
  if ((state.inventory[itemId] ?? 0) < 1) return { ok: false, reason: 'not-owned' };
  return {
    ok: true,
    price,
    state: {
      ...state,
      money: state.money + price,
      inventory: changeItem(state.inventory, itemId, -1),
    },
  };
}
