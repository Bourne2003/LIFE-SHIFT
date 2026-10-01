import { activeQuestIds, currentObjective, type GameNotice } from '@life-shift/shared';
import type { DialogueView } from '../game/DialogueController';
import { formatMoney, itemName } from '../game/format';
import type { GameServices } from '../game/services';
import { mountBag } from './bag';
import { el } from './dom';
import { mountMenu } from './menu';
import { mountShop } from './shop';
import './ui.css';

/**
 * The DOM UI drawn over the canvas: HUD buttons (menu, bag), hint, quest tracker, toasts,
 * action button, dialogue, and the menu / bag / shop panels.
 * DOM rather than Phaser text for crisp type on high-DPI phones, real buttons, accessibility
 * and responsive CSS (see docs/decisions/ADR-003-dom-ui-overlay.md). Components re-render only
 * when the services report a change — never per frame.
 */
export function mountUi(root: HTMLElement, services: GameServices): () => void {
  const { session, dialogue, world, input, content, ui } = services;
  const cleanups: (() => void)[] = [];

  // --- Controls hint ------------------------------------------------------------------------
  const hint = el('div', { className: 'ui-hint ui-panel' }, [
    el('span', { className: 'when-fine', text: 'WASD / arrows to move · E to talk · I for bag' }),
    el('span', { className: 'when-coarse', text: 'Drag on the left to move · tap Talk' }),
  ]);
  const hideHint = window.setTimeout(() => hint.classList.add('is-hidden'), 8000);
  cleanups.push(() => window.clearTimeout(hideHint));

  // --- Quest tracker ------------------------------------------------------------------------
  const tracker = el('section', {
    className: 'ui-tracker ui-panel is-hidden',
    attrs: { 'aria-label': 'Active quests', 'data-testid': 'quest-tracker' },
  });
  const renderTracker = () => {
    const state = session.state;
    const items = activeQuestIds(state).map((id) => {
      const quest = content.quests[id]!;
      const objective = currentObjective(state, content, id);
      return el('div', { className: 'ui-tracker__quest' }, [
        el('div', { className: 'ui-tracker__title', text: quest.title }),
        el('div', { className: 'ui-tracker__objective', text: objective?.description ?? '' }),
      ]);
    });
    tracker.replaceChildren(...items);
    tracker.classList.toggle('is-hidden', items.length === 0);
  };
  cleanups.push(session.on('state', renderTracker));
  renderTracker();

  // --- Toasts -------------------------------------------------------------------------------
  const toasts = el('div', {
    className: 'ui-toasts',
    attrs: { 'aria-live': 'polite', 'data-testid': 'toasts' },
  });
  const toast = (text: string, kind = '') => {
    const node = el('div', { className: `ui-toast ui-panel ${kind}`, text });
    toasts.append(node);
    window.setTimeout(() => node.remove(), 3500);
  };
  cleanups.push(
    session.on('notice', (n) => {
      // The shop panel reports its own trades; don't repeat them as toasts.
      const trade =
        n.type === 'itemsReceived' || n.type === 'itemsRemoved' || n.type === 'moneyChanged';
      if (trade && ui.modal === 'shop') return;
      toast(noticeText(n, services), `is-${n.type}`);
    }),
  );
  cleanups.push(
    world.on('areaEntered', (loc) =>
      toast(loc.hidden ? `Discovered: ${loc.name}` : loc.name, 'is-area'),
    ),
  );

  // --- Action button (also the desktop prompt) ----------------------------------------------
  const actionLabel = el('span');
  const action = el(
    'button',
    { className: 'ui-action is-hidden', attrs: { type: 'button', 'data-testid': 'action' } },
    [el('kbd', { className: 'when-fine', text: 'E' }), actionLabel],
  );
  // pointerdown, not click: reacts instantly on touch and never steals keyboard focus.
  action.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.press('interact');
  });
  let target: { name: string; kind: 'npc' | 'object' } | null = null;
  const renderAction = () => {
    actionLabel.textContent = target
      ? `${target.kind === 'npc' ? 'Talk to' : 'Look at'} ${target.name}`
      : '';
    action.classList.toggle('is-hidden', !target || dialogue.active || ui.modal !== null);
  };
  cleanups.push(
    world.on('interactTarget', (t) => {
      target = t;
      renderAction();
    }),
  );

  // --- Dialogue -----------------------------------------------------------------------------
  const speaker = el('div', { className: 'ui-dialogue__speaker' });
  const text = el('p', { className: 'ui-dialogue__text' });
  const choices = el('div', { className: 'ui-dialogue__choices' });
  const more = el('div', { className: 'ui-dialogue__more', text: 'Continue ▸' });
  const box = el(
    'section',
    {
      className: 'ui-dialogue ui-panel is-hidden',
      attrs: { role: 'dialog', 'aria-live': 'polite', 'data-testid': 'dialogue' },
    },
    [speaker, text, choices, more],
  );
  box.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    input.press('interact');
  });
  const renderDialogue = (view: DialogueView | null) => {
    box.classList.toggle('is-hidden', !view);
    renderAction();
    if (!view) return;
    speaker.textContent = view.speaker;
    text.textContent = view.text;
    more.hidden = view.choices.length > 0;
    choices.replaceChildren(
      ...view.choices.map((c, i) => {
        const button = el('button', { className: 'ui-choice', attrs: { type: 'button' } }, [
          el('kbd', { className: 'when-fine', text: String(i + 1) }),
          c.text,
        ]);
        button.addEventListener('click', () => dialogue.choose(c.index));
        return button;
      }),
    );
  };
  cleanups.push(dialogue.on('change', renderDialogue));

  // Keyboard: number keys pick dialogue choices, I toggles the bag, Esc closes any panel.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && ui.modal) return ui.close();
    if (
      e.key.toLowerCase() === 'i' &&
      !dialogue.active &&
      (ui.modal === null || ui.modal === 'bag')
    ) {
      return ui.toggle('bag');
    }
    const view = dialogue.view();
    const n = Number(e.key);
    if (!view || ui.modal || !Number.isInteger(n) || n < 1) return;
    const choice = view.choices[n - 1];
    if (choice) dialogue.choose(choice.index);
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  // --- Panels: menu (save / load / new game), bag, shop --------------------------------------
  const menu = mountMenu(services, toast);
  const bag = mountBag(services);
  const shop = mountShop(services);
  cleanups.push(menu.destroy, bag.destroy, shop.destroy, ui.on('modal', renderAction));

  const [menuButton, ...menuPanels] = menu.elements;
  const [bagButton, ...bagPanels] = bag.elements;
  const hud = el('div', { className: 'ui-hud' }, [menuButton!, bagButton!]);

  root.replaceChildren(
    hud,
    hint,
    tracker,
    toasts,
    action,
    box,
    ...menuPanels,
    ...bagPanels,
    ...shop.elements,
  );
  return () => {
    cleanups.forEach((c) => c());
    root.replaceChildren();
  };
}

function noticeText(notice: GameNotice, { content }: GameServices): string {
  const title = (id: string) => content.quests[id]?.title ?? id;
  switch (notice.type) {
    case 'questStarted':
      return `New quest: ${title(notice.quest)}`;
    case 'objectiveCompleted': {
      const objective = content.quests[notice.quest]?.objectives.find(
        (o) => o.id === notice.objective,
      );
      return `✓ ${objective?.description ?? notice.objective}`;
    }
    case 'questCompleted':
      return `Quest complete: ${title(notice.quest)}`;
    case 'questFailed':
      return `Quest failed: ${title(notice.quest)}`;
    case 'itemsReceived':
      return `+${notice.quantity} ${itemName(content, notice.item)}`;
    case 'itemsRemoved':
      return `−${notice.quantity} ${itemName(content, notice.item)}`;
    case 'bagFull':
      return `Bag full — ${notice.quantity} ${itemName(content, notice.item)} left behind`;
    case 'moneyChanged':
      return `${notice.amount > 0 ? '+' : ''}${formatMoney(content, notice.amount)}`;
  }
}
