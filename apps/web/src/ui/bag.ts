import { INVENTORY_SLOTS, usedSlots } from '@life-shift/shared';
import { formatMoney } from '../game/format';
import type { GameServices } from '../game/services';
import { el } from './dom';

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  food: 'Food',
  ingredient: 'Ingredient',
  quest: 'Quest item',
  misc: 'Misc',
};

/** The bag button (shows your money) and the bag panel: slots, item details. */
export function mountBag(services: GameServices): {
  elements: HTMLElement[];
  destroy: () => void;
} {
  const { session, content, ui } = services;
  const cleanups: (() => void)[] = [];

  const money = el('span', { attrs: { 'data-testid': 'money' } });
  const openButton = el(
    'button',
    {
      className: 'ui-hud-button ui-bag-button',
      attrs: { type: 'button', 'aria-label': 'Bag', 'data-testid': 'bag-button' },
    },
    [el('span', { text: '🎒', attrs: { 'aria-hidden': 'true' } }), money],
  );

  const title = el('h2', { className: 'ui-modal__title' });
  const panelMoney = el('p', { className: 'ui-modal__status' });
  const grid = el('div', { className: 'ui-bag__grid', attrs: { role: 'list' } });
  const details = el('div', { className: 'ui-bag__details', attrs: { 'aria-live': 'polite' } });
  const close = el('button', {
    className: 'ui-modal__item',
    attrs: { type: 'button', 'data-testid': 'bag-close' },
  });
  close.textContent = 'Close';
  const panel = el(
    'section',
    {
      className: 'ui-modal ui-modal--wide ui-panel is-hidden',
      attrs: { role: 'dialog', 'aria-label': 'Bag', 'data-testid': 'bag' },
    },
    [title, panelMoney, grid, details, close],
  );

  let selected: number | null = null;
  const render = () => {
    const state = session.state;
    money.textContent = formatMoney(content, state.money);
    if (ui.modal !== 'bag') return;

    title.textContent = `Bag ${usedSlots(state, content)}/${INVENTORY_SLOTS}`;
    panelMoney.textContent = `Money: ${formatMoney(content, state.money)}`;
    const slots = Math.max(INVENTORY_SLOTS, state.inventory.length);
    if (selected !== null && !state.inventory[selected]) selected = null;
    grid.replaceChildren(
      ...Array.from({ length: slots }, (_, i) => {
        const stack = state.inventory[i];
        if (!stack)
          return el('div', { className: 'ui-bag__slot is-empty', attrs: { role: 'listitem' } });
        const item = content.items[stack.item];
        const slot = el(
          'button',
          {
            className: `ui-bag__slot${selected === i ? ' is-selected' : ''}`,
            attrs: { type: 'button', role: 'listitem', 'data-testid': 'bag-slot' },
          },
          [
            el('span', { className: 'ui-bag__name', text: item?.name ?? stack.item }),
            el('span', { className: 'ui-bag__qty', text: `×${stack.quantity}` }),
          ],
        );
        slot.addEventListener('click', () => {
          selected = i;
          render();
        });
        return slot;
      }),
    );

    const pick = selected === null ? undefined : state.inventory[selected];
    const item = pick ? content.items[pick.item] : undefined;
    details.replaceChildren(
      ...(item
        ? [
            el('strong', { text: item.name }),
            el('span', {
              className: 'ui-bag__category',
              text: CATEGORY_LABELS[item.category] ?? '',
            }),
            el('p', { text: item.description }),
          ]
        : [
            el('p', {
              className: 'ui-muted',
              text: state.inventory.length
                ? 'Tap an item to see what it is.'
                : 'Your bag is empty.',
            }),
          ]),
    );
  };

  cleanups.push(session.on('state', render));
  cleanups.push(
    ui.on('modal', (modal) => {
      panel.classList.toggle('is-hidden', modal !== 'bag');
      openButton.setAttribute('aria-expanded', String(modal === 'bag'));
      if (modal === 'bag') {
        selected = null;
        render();
        close.focus();
      }
    }),
  );
  openButton.addEventListener('click', () => ui.toggle('bag'));
  close.addEventListener('click', () => ui.close('bag'));

  render();
  return { elements: [openButton, panel], destroy: () => cleanups.forEach((c) => c()) };
}
