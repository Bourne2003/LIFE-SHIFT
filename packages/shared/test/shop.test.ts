import { describe, expect, it } from 'vitest';
import {
  INVENTORY_SLOTS,
  MAX_TRADE_QUANTITY,
  buy,
  buyPrice,
  countItem,
  createInitialState,
  isShopOpen,
  sell,
  sellPrice,
  type GameState,
} from '../src';
import { content } from './fixtures';

const rich: GameState = { ...createInitialState(), money: 100 };
const items = content.items;
const stall = content.shops.stall!;

describe('prices', () => {
  it('uses the stock override or the base price', () => {
    expect(buyPrice(stall, items.apple!)).toBe(10);
    expect(buyPrice(stall, items.rice!)).toBe(25);
    expect(buyPrice(stall, items.letter!)).toBeUndefined();
  });

  it('pays the buyback rate for categories the shop buys, nothing else', () => {
    expect(sellPrice(stall, items.apple!)).toBe(5);
    expect(sellPrice(stall, items.rice!)).toBeUndefined(); // stall buys food only
    expect(sellPrice(content.shops.night_shop!, items.letter!)).toBeUndefined(); // not sellable
  });
});

describe('buy', () => {
  it('takes money and adds items', () => {
    const result = buy(rich, content, 'stall', 'rice', 2);
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.money).toBe(50);
    expect(countItem(result.state, 'rice')).toBe(2);
    expect(result.receipt).toEqual({ shop: 'stall', item: 'rice', quantity: 2, total: 50 });
    expect(result.notices).toEqual([
      { type: 'itemsReceived', item: 'rice', quantity: 2 },
      { type: 'moneyChanged', amount: -50 },
    ]);
  });

  it('refuses when money, stock, bag space or the shop say no', () => {
    const fails = (state: GameState, shop: string, item: string, qty: number) => {
      const r = buy(state, content, shop, item, qty);
      return r.ok ? 'ok' : r.reason;
    };
    expect(fails(rich, 'stall', 'rice', 5)).toBe('not_enough_money');
    expect(fails(rich, 'stall', 'letter', 1)).toBe('not_for_sale');
    expect(fails(rich, 'night_shop', 'apple', 1)).toBe('shop_closed');
    expect(fails(rich, 'nope', 'apple', 1)).toBe('unknown_shop');
    expect(fails(rich, 'stall', 'nope', 1)).toBe('unknown_item');
    for (const qty of [0, -1, 1.5, MAX_TRADE_QUANTITY + 1, Number.NaN]) {
      expect(fails(rich, 'stall', 'apple', qty)).toBe('invalid_quantity');
    }
    const fullBag: GameState = {
      ...rich,
      inventory: Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'rice', quantity: 10 })),
    };
    expect(fails(fullBag, 'stall', 'apple', 1)).toBe('bag_full');
  });

  it('a failed trade leaves the state untouched', () => {
    const before = JSON.stringify(rich);
    buy(rich, content, 'stall', 'rice', 99);
    expect(JSON.stringify(rich)).toBe(before);
  });

  it('opens and closes with world state', () => {
    const shop = content.shops.night_shop!;
    expect(isShopOpen(shop, rich, content)).toBe(false);
    const open = { ...rich, flags: { open: true } };
    expect(isShopOpen(shop, open, content)).toBe(true);
    expect(buy(open, content, 'night_shop', 'apple', 1).ok).toBe(true);
  });
});

describe('sell', () => {
  const stocked: GameState = { ...rich, inventory: [{ item: 'apple', quantity: 4 }] };

  it('removes items and pays the buyback price', () => {
    const result = sell(stocked, content, 'stall', 'apple', 3);
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.money).toBe(115);
    expect(countItem(result.state, 'apple')).toBe(1);
  });

  it('refuses items the player lacks or the shop will not take', () => {
    const reason = (item: string, qty: number) => {
      const r = sell(stocked, content, 'stall', item, qty);
      return r.ok ? 'ok' : r.reason;
    };
    expect(reason('apple', 5)).toBe('not_enough_items');
    expect(reason('rice', 1)).toBe('shop_wont_buy');
    expect(reason('letter', 1)).toBe('shop_wont_buy');
  });
});
