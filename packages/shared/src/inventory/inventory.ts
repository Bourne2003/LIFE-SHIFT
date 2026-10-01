import type { GameContent, ItemDef, ItemStack } from '../content/types';
import type { GameState } from '../state/gameState';

/** Bag size. Quest items never count against it, so a quest can't be blocked by a full bag. */
export const INVENTORY_SLOTS = 20;

export function itemDef(content: GameContent, item: string): ItemDef {
  const def = content.items[item];
  if (!def) throw new Error(`Unknown item: ${item}`);
  return def;
}

export function countItem(state: GameState, item: string): number {
  return state.inventory.reduce((n, s) => (s.item === item ? n + s.quantity : n), 0);
}

/** Slots used by items that count against the bag size. */
export function usedSlots(state: GameState, content: GameContent): number {
  return state.inventory.filter((s) => content.items[s.item]?.category !== 'quest').length;
}

export interface AddResult {
  readonly state: GameState;
  readonly added: number;
  /** What did not fit. */
  readonly leftover: number;
}

/** Adds items: tops up existing stacks first, then opens new slots while there is room. */
export function addItem(
  state: GameState,
  content: GameContent,
  item: string,
  quantity: number,
): AddResult {
  const def = itemDef(content, item);
  if (quantity <= 0) return { state, added: 0, leftover: 0 };

  let remaining = quantity;
  const inventory = state.inventory.map((slot) => {
    if (slot.item !== item || remaining === 0 || slot.quantity >= def.maxStack) return slot;
    const take = Math.min(def.maxStack - slot.quantity, remaining);
    remaining -= take;
    return { item, quantity: slot.quantity + take };
  });

  const unlimited = def.category === 'quest';
  let free = INVENTORY_SLOTS - usedSlots(state, content);
  while (remaining > 0 && (unlimited || free > 0)) {
    const take = Math.min(def.maxStack, remaining);
    inventory.push({ item, quantity: take });
    remaining -= take;
    free -= 1;
  }

  const added = quantity - remaining;
  return {
    state: added === 0 ? state : { ...state, inventory },
    added,
    leftover: remaining,
  };
}

/** True if all of `quantity` would fit. */
export function canAdd(
  state: GameState,
  content: GameContent,
  item: string,
  quantity: number,
): boolean {
  return addItem(state, content, item, quantity).leftover === 0;
}

/** Removes up to `quantity`, taking from the last stacks first and dropping emptied slots. */
export function removeItem(
  state: GameState,
  item: string,
  quantity: number,
): { readonly state: GameState; readonly removed: number } {
  let remaining = Math.max(0, quantity);
  const inventory: ItemStack[] = [];
  for (let i = state.inventory.length - 1; i >= 0; i--) {
    const slot = state.inventory[i]!;
    if (slot.item === item && remaining > 0) {
      const take = Math.min(slot.quantity, remaining);
      remaining -= take;
      if (slot.quantity > take) inventory.unshift({ item, quantity: slot.quantity - take });
    } else inventory.unshift(slot);
  }
  const removed = Math.max(0, quantity) - remaining;
  return { state: removed === 0 ? state : { ...state, inventory }, removed };
}
