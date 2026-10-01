import { activeQuestIds, currentObjective, type QuestNotice } from '@life-shift/shared';
import type { GameServices } from '../game/services';
import type { DialogueView } from '../game/DialogueController';
import { el } from './dom';
import { mountMenu } from './menu';
import './ui.css';

/**
 * The DOM UI drawn over the canvas: hint, quest tracker, toasts, action button and dialogue.
 * DOM rather than Phaser text for crisp type on high-DPI phones, real buttons, accessibility
 * and responsive CSS (see docs/decisions/ADR-003-dom-ui-overlay.md). Components re-render only
 * when the services report a change — never per frame.
 */
export function mountUi(root: HTMLElement, services: GameServices): () => void {
  const { session, dialogue, world, input, content } = services;
  const cleanups: (() => void)[] = [];

  // --- Controls hint ------------------------------------------------------------------------
  const hint = el('div', { className: 'ui-hint ui-panel' }, [
    el('span', { className: 'when-fine', text: 'WASD / arrows to move · E to talk' }),
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
  cleanups.push(session.on('notice', (n) => toast(noticeText(n, services), `is-${n.type}`)));
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
    action.classList.toggle('is-hidden', !target || dialogue.active || services.ui.menuOpen);
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

  // Number keys pick dialogue choices.
  const onKey = (e: KeyboardEvent) => {
    const view = dialogue.view();
    const n = Number(e.key);
    if (!view || !Number.isInteger(n) || n < 1) return;
    const choice = view.choices[n - 1];
    if (choice) dialogue.choose(choice.index);
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  // --- Menu (save / load / new game) -------------------------------------------------------
  const menu = mountMenu(services, toast, () => renderAction());
  cleanups.push(menu.destroy);

  root.replaceChildren(hint, tracker, toasts, action, box, ...menu.elements);
  return () => {
    cleanups.forEach((c) => c());
    root.replaceChildren();
  };
}

function noticeText(notice: QuestNotice, { content }: GameServices): string {
  const quest = content.quests[notice.quest];
  switch (notice.type) {
    case 'questStarted':
      return `New quest: ${quest?.title}`;
    case 'objectiveCompleted':
      return `✓ ${quest?.objectives.find((o) => o.id === notice.objective)?.description}`;
    case 'questCompleted':
      return `Quest complete: ${quest?.title}`;
    case 'questFailed':
      return `Quest failed: ${quest?.title}`;
  }
}
