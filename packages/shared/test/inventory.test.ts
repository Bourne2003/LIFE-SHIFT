import { describe, expect, it } from 'vitest';
import {
  INVENTORY_SLOTS,
  addItem,
  applyEffects,
  canAdd,
  countItem,
  createInitialState,
  evaluateCondition,
  handleQuestEvent,
  newGameState,
  removeItem,
  startQuest,
  usedSlots,
  type GameState,
} from '../src';
import { content } from './fixtures';

const empty = createInitialState();
const withItems = (inventory: GameState['inventory']): GameState => ({ ...empty, inventory });

describe('bag', () => {
  it('a new game starts with the configured money and items', () => {
    expect(newGameState(content)).toMatchObject({
      money: 100,
      inventory: [{ item: 'apple', quantity: 2 }],
    });
  });

  it('stacks up to the max stack, then opens new slots', () => {
    const result = addItem(withItems([{ item: 'apple', quantity: 3 }]), content, 'apple', 9);
    expect(result.added).toBe(9);
    expect(result.state.inventory).toEqual([
      { item: 'apple', quantity: 5 },
      { item: 'apple', quantity: 5 },
      { item: 'apple', quantity: 2 },
    ]);
    expect(countItem(result.state, 'apple')).toBe(12);
  });

  it('stops at the slot limit and reports what did not fit', () => {
    const full = withItems(
      Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'rice', quantity: 10 })),
    );
    const result = addItem(full, content, 'apple', 3);
    expect(result).toMatchObject({ added: 0, leftover: 3 });
    expect(result.state).toBe(full);
    expect(canAdd(full, content, 'apple', 1)).toBe(false);
  });

  it('quest items always fit and do not use up slots', () => {
    const full = withItems(
      Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'rice', quantity: 10 })),
    );
    const result = addItem(full, content, 'letter', 1);
    expect(result.added).toBe(1);
    expect(usedSlots(result.state, content)).toBe(INVENTORY_SLOTS);
  });

  it('removes from the last stacks first and drops empty slots', () => {
    const state = withItems([
      { item: 'apple', quantity: 5 },
      { item: 'rice', quantity: 1 },
      { item: 'apple', quantity: 2 },
    ]);
    const result = removeItem(state, 'apple', 4);
    expect(result.removed).toBe(4);
    expect(result.state.inventory).toEqual([
      { item: 'apple', quantity: 3 },
      { item: 'rice', quantity: 1 },
    ]);
    expect(removeItem(state, 'apple', 100).removed).toBe(7);
    expect(removeItem(state, 'letter', 1).state).toBe(state);
  });

  it('rejects unknown items', () => {
    expect(() => addItem(empty, content, 'unicorn', 1)).toThrow(/Unknown item/);
  });
});

describe('item and money effects and conditions', () => {
  it('give / take / adjustMoney produce notices', () => {
    const result = applyEffects(empty, content, [
      { type: 'giveItem', item: 'apple', quantity: 3 },
      { type: 'takeItem', item: 'apple' },
      { type: 'adjustMoney', amount: 40 },
      { type: 'adjustMoney', amount: -100 },
      { type: 'openShop', shop: 'stall' },
    ]);
    expect(result.state.inventory).toEqual([{ item: 'apple', quantity: 2 }]);
    expect(result.state.money).toBe(0); // never negative
    expect(result.notices).toEqual([
      { type: 'itemsReceived', item: 'apple', quantity: 3 },
      { type: 'itemsRemoved', item: 'apple', quantity: 1 },
      { type: 'moneyChanged', amount: 40 },
      { type: 'moneyChanged', amount: -40 },
    ]);
  });

  it('giveItem into a full bag reports the overflow', () => {
    const full = withItems(
      Array.from({ length: INVENTORY_SLOTS }, () => ({ item: 'rice', quantity: 10 })),
    );
    const result = applyEffects(full, content, [{ type: 'giveItem', item: 'apple', quantity: 2 }]);
    expect(result.notices).toEqual([{ type: 'bagFull', item: 'apple', quantity: 2 }]);
  });

  it('hasItem and money conditions', () => {
    const state = { ...withItems([{ item: 'apple', quantity: 2 }]), money: 30 };
    const check = (c: Parameters<typeof evaluateCondition>[0]) =>
      evaluateCondition(c, state, content);
    expect(check({ type: 'hasItem', item: 'apple' })).toBe(true);
    expect(check({ type: 'hasItem', item: 'apple', quantity: 3 })).toBe(false);
    expect(check({ type: 'money', atLeast: 30 })).toBe(true);
    expect(check({ type: 'money', atLeast: 31 })).toBe(false);
  });
});

describe('deliver objectives', () => {
  const started = startQuest(empty, content, 'deliver').state;

  it('do not complete without the item', () => {
    const result = handleQuestEvent(started, content, { type: 'talk', npc: 'friend' });
    expect(result.notices).toEqual([]);
  });

  it('hand the item over and complete when carrying it', () => {
    const carrying = addItem(started, content, 'letter', 1).state;
    const result = handleQuestEvent(carrying, content, { type: 'talk', npc: 'friend' });
    expect(countItem(result.state, 'letter')).toBe(0);
    expect(result.state.money).toBe(50);
    expect(result.notices.map((n) => n.type)).toEqual([
      'itemsRemoved',
      'objectiveCompleted',
      'questCompleted',
      'moneyChanged',
    ]);
  });
});
