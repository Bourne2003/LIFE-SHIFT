import type { LocalizedText } from '../i18n/locale';

export interface ItemDef {
  readonly id: string;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
}

export type ItemCatalog = Readonly<Record<string, ItemDef>>;

/** Item counts by id. Absent means none; stored counts are always positive integers. */
export type Inventory = Readonly<Record<string, number>>;

export function itemCount(inventory: Inventory, itemId: string): number {
  return inventory[itemId] ?? 0;
}

/** Adds (or with a negative `delta`, removes) items, never going below zero. */
export function changeItem(inventory: Inventory, itemId: string, delta: number): Inventory {
  const next = Math.max(0, itemCount(inventory, itemId) + delta);
  if (next === itemCount(inventory, itemId)) return inventory;
  const result = { ...inventory, [itemId]: next };
  if (next === 0) delete result[itemId];
  return result;
}
