import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  STARTING_MONEY,
  applyEffects,
  buyItem,
  changeItem,
  conditionHolds,
  itemCount,
  validateContent,
  type GameContent,
  type ShopDef,
} from '../src';

const t = (s: string) => ({ th: s, en: s });

describe('inventory', () => {
  it('adds and removes items without going below zero', () => {
    let inv = changeItem({}, 'a', 2);
    expect(inv).toEqual({ a: 2 });
    inv = changeItem(inv, 'a', -1);
    expect(itemCount(inv, 'a')).toBe(1);
    inv = changeItem(inv, 'a', -5);
    expect(inv).toEqual({}); // empty entries are removed
    expect(changeItem(inv, 'a', -1)).toBe(inv); // unchanged keeps identity
  });
});

describe('item and money effects/conditions', () => {
  it('give and take items and money', () => {
    let s = applyEffects(INITIAL_STATE, [{ type: 'changeItem', item: 'a', count: 2 }], {});
    expect(conditionHolds(s, { item: 'a' })).toBe(true);
    expect(conditionHolds(s, { item: 'a', count: 3 })).toBe(false);
    expect(conditionHolds(s, { item: 'b', has: false })).toBe(true);
    s = applyEffects(s, [{ type: 'changeMoney', amount: 25 }], {});
    expect(s.money).toBe(STARTING_MONEY + 25);
    s = applyEffects(s, [{ type: 'changeMoney', amount: -1000 }], {});
    expect(s.money).toBe(0);
  });
});

describe('buyItem', () => {
  const shop: ShopDef = { id: 's', name: t('S'), stock: [{ item: 'tea', price: 20 }] };

  it('takes the price and gives the item', () => {
    const r = buyItem(INITIAL_STATE, shop, 'tea');
    expect(r.ok && r.state.money).toBe(STARTING_MONEY - 20);
    expect(r.ok && r.state.inventory).toEqual({ tea: 1 });
  });

  it('refuses when money is short or the item is not sold', () => {
    expect(buyItem({ ...INITIAL_STATE, money: 19 }, shop, 'tea')).toEqual({
      ok: false,
      reason: 'not-enough-money',
    });
    expect(buyItem(INITIAL_STATE, shop, 'gold')).toEqual({ ok: false, reason: 'not-for-sale' });
  });
});

describe('validateContent (items and shops)', () => {
  it('reports unknown items, bad prices and unknown shops', () => {
    const content: GameContent = {
      quests: {},
      props: [],
      items: { tea: { id: 'tea', name: t('Tea'), description: { th: '', en: 'x' } } },
      shops: {
        s: { id: 's', name: t('S'), stock: [{ item: 'ghost', price: 0 }] },
      },
      dialogues: {
        d: {
          id: 'd',
          start: 'a',
          nodes: {
            a: {
              text: t('x'),
              effects: [{ type: 'changeItem', item: 'nope', count: 1 }],
              choices: [{ text: t('buy'), opensShop: 'missing' }],
            },
          },
        },
      },
      npcs: [
        {
          id: 'n',
          name: t('N'),
          xTiles: 0,
          yTiles: 0,
          dialogue: [{ when: [{ item: 'zz' }], dialogue: 'd' }, { dialogue: 'd' }],
        },
      ],
    };
    expect(validateContent(content)).toEqual(
      expect.arrayContaining([
        'item "tea" description: missing translation (th)',
        'shop "s": unknown item "ghost"',
        'shop "s": price of "ghost" must be a positive whole number',
        'dialogue "d" node "a": unknown item "nope"',
        'dialogue "d" node "a": unknown shop "missing"',
        'npc "n": unknown item "zz"',
      ]),
    );
  });
});
