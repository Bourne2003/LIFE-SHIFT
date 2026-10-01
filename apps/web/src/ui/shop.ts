import { buyPrice, countItem, sellPrice, type TradeFailure } from '@life-shift/shared';
import { formatMoney, itemName } from '../game/format';
import type { GameServices } from '../game/services';
import { el } from './dom';

const FAILURE_TEXT: Readonly<Record<TradeFailure, string>> = {
  not_enough_money: "You can't afford that.",
  bag_full: 'Your bag is full.',
  shop_closed: 'The shop is closed.',
  not_enough_items: "You don't have that many.",
  shop_wont_buy: "They don't buy that here.",
  not_for_sale: "That's not for sale.",
  invalid_quantity: 'That amount is not allowed.',
  unknown_item: 'Unknown item.',
  unknown_shop: 'Unknown shop.',
};

type Tab = 'buy' | 'sell';

/**
 * Shop panel, opened from a shopkeeper's dialogue. It only displays and requests: every trade
 * goes through GameSession.buy/sell, which applies the shared rules and can refuse.
 */
export function mountShop(services: GameServices): {
  elements: HTMLElement[];
  destroy: () => void;
} {
  const { session, content, ui } = services;
  const cleanups: (() => void)[] = [];

  const title = el('h2', { className: 'ui-modal__title', attrs: { 'data-testid': 'shop-title' } });
  const money = el('p', { className: 'ui-modal__status', attrs: { 'data-testid': 'shop-money' } });
  const tabButton = (tab: Tab, label: string) =>
    el(
      'button',
      { className: 'ui-tab', attrs: { type: 'button', 'data-testid': `shop-tab-${tab}` } },
      [label],
    );
  const buyTab = tabButton('buy', 'Buy');
  const sellTab = tabButton('sell', 'Sell');
  const list = el('div', { className: 'ui-shop__list', attrs: { role: 'list' } });
  const message = el('p', {
    className: 'ui-shop__message',
    attrs: { 'aria-live': 'polite', 'data-testid': 'shop-message' },
  });
  const close = el('button', {
    className: 'ui-modal__item',
    attrs: { type: 'button', 'data-testid': 'shop-close' },
  });
  close.textContent = 'Leave';
  const panel = el(
    'section',
    {
      className: 'ui-modal ui-modal--wide ui-panel is-hidden',
      attrs: { role: 'dialog', 'aria-label': 'Shop', 'data-testid': 'shop' },
    },
    [title, money, el('div', { className: 'ui-tabs' }, [buyTab, sellTab]), list, message, close],
  );

  let tab: Tab = 'buy';
  const row = (
    itemId: string,
    price: number | undefined,
    action: 'Buy' | 'Sell',
    onClick: () => void,
  ) => {
    const state = session.state;
    const owned = countItem(state, itemId);
    const button = el(
      'button',
      {
        className: 'ui-shop__action',
        attrs: { type: 'button', 'data-testid': `${action.toLowerCase()}-${itemId}` },
      },
      [price === undefined ? '—' : `${action} ${formatMoney(content, price)}`],
    );
    button.disabled = price === undefined;
    button.addEventListener('click', onClick);
    return el(
      'div',
      { className: 'ui-shop__row', attrs: { role: 'listitem', 'data-testid': 'shop-row' } },
      [
        el('div', { className: 'ui-shop__item' }, [
          el('strong', { text: itemName(content, itemId) }),
          el('span', { className: 'ui-muted', text: `You have ${owned}` }),
        ]),
        button,
      ],
    );
  };

  const render = () => {
    const shop = ui.shop ? content.shops[ui.shop] : undefined;
    if (ui.modal !== 'shop' || !shop) return;
    const state = session.state;
    title.textContent = shop.name;
    money.textContent = `Your money: ${formatMoney(content, state.money)}`;
    buyTab.setAttribute('aria-pressed', String(tab === 'buy'));
    sellTab.setAttribute('aria-pressed', String(tab === 'sell'));

    if (tab === 'buy') {
      list.replaceChildren(
        ...shop.stock.map(({ item }) =>
          row(item, buyPrice(shop, content.items[item]!), 'Buy', () => trade('buy', item)),
        ),
      );
      return;
    }
    // Sell tab: everything in the bag this shop will take (one row per item kind).
    const kinds = [...new Set(state.inventory.map((s) => s.item))].filter(
      (id) => sellPrice(shop, content.items[id]!) !== undefined,
    );
    list.replaceChildren(
      ...(kinds.length
        ? kinds.map((item) =>
            row(item, sellPrice(shop, content.items[item]!), 'Sell', () => trade('sell', item)),
          )
        : [el('p', { className: 'ui-muted', text: 'Nothing in your bag that they buy.' })]),
    );
  };

  const trade = (kind: Tab, item: string) => {
    if (!ui.shop) return;
    const result = kind === 'buy' ? session.buy(ui.shop, item, 1) : session.sell(ui.shop, item, 1);
    message.classList.toggle('is-error', !result.ok);
    message.textContent = result.ok
      ? `${kind === 'buy' ? 'Bought' : 'Sold'} ${itemName(content, item)} for ${formatMoney(content, result.receipt.total)}`
      : FAILURE_TEXT[result.reason];
    render();
  };

  const setTab = (next: Tab) => {
    tab = next;
    message.textContent = '';
    render();
  };
  buyTab.addEventListener('click', () => setTab('buy'));
  sellTab.addEventListener('click', () => setTab('sell'));
  close.addEventListener('click', () => ui.close('shop'));

  cleanups.push(session.on('state', render));
  cleanups.push(
    ui.on('modal', (modal) => {
      panel.classList.toggle('is-hidden', modal !== 'shop');
      if (modal === 'shop') {
        tab = 'buy';
        message.textContent = '';
        render();
        close.focus();
      }
    }),
  );

  return { elements: [panel], destroy: () => cleanups.forEach((c) => c()) };
}
