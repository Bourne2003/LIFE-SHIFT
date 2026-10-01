import type { GameContent } from '@life-shift/shared';

/** `฿120` (or `-฿15`) using the content's currency symbol. */
export function formatMoney(content: GameContent, amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${content.economy.currencySymbol}${Math.abs(amount)}`;
}

export function itemName(content: GameContent, item: string): string {
  return content.items[item]?.name ?? item;
}
