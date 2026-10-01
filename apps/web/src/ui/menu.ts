import type { GameServices } from '../game/services';
import type { SaveStatus } from '../game/SaveService';
import { el } from './dom';

const CONFIRM_WINDOW_MS = 4000;

/**
 * Game menu: save, load the last save, start a new game. Uses the shared modal slot, so the
 * game pauses while it is open. "New game" needs a second tap to confirm (it deletes the save).
 */
export function mountMenu(
  services: GameServices,
  toast: (text: string, kind?: string) => void,
): { elements: HTMLElement[]; destroy: () => void } {
  const { save, ui } = services;
  const cleanups: (() => void)[] = [];

  const openButton = el(
    'button',
    {
      className: 'ui-hud-button ui-menu-button',
      attrs: { type: 'button', 'aria-label': 'Menu', 'data-testid': 'menu-button' },
    },
    ['☰'],
  );

  const status = el('p', {
    className: 'ui-modal__status',
    attrs: { 'data-testid': 'save-status' },
  });
  const button = (label: string, testId: string) =>
    el(
      'button',
      { className: 'ui-modal__item', attrs: { type: 'button', 'data-testid': testId } },
      [label],
    );
  const saveButton = button('Save game', 'menu-save');
  const loadButton = button('Load last save', 'menu-load');
  const resetButton = button('New game', 'menu-reset');
  const closeButton = button('Resume', 'menu-close');

  const panel = el(
    'section',
    {
      className: 'ui-modal ui-panel is-hidden',
      attrs: { role: 'dialog', 'aria-label': 'Menu', 'data-testid': 'menu' },
    },
    [
      el('h2', { className: 'ui-modal__title', text: 'Menu' }),
      status,
      saveButton,
      loadButton,
      resetButton,
      closeButton,
    ],
  );

  let confirmUntil = 0;
  const renderStatus = () => {
    status.textContent = save.lastSavedAt
      ? `Last saved ${formatTime(save.lastSavedAt)}`
      : 'Not saved yet';
    loadButton.disabled = save.lastSavedAt === null;
  };
  const resetConfirm = () => {
    confirmUntil = 0;
    resetButton.textContent = 'New game';
    resetButton.classList.remove('is-danger');
  };

  cleanups.push(
    ui.on('modal', (modal) => {
      const open = modal === 'menu';
      panel.classList.toggle('is-hidden', !open);
      openButton.setAttribute('aria-expanded', String(open));
      resetConfirm();
      if (open) {
        renderStatus();
        saveButton.focus();
      }
    }),
  );

  openButton.addEventListener('click', () => ui.toggle('menu'));
  closeButton.addEventListener('click', () => ui.close('menu'));
  saveButton.addEventListener('click', () => void save.save());
  loadButton.addEventListener('click', async () => {
    if (await save.load()) ui.close('menu');
  });
  resetButton.addEventListener('click', async () => {
    if (Date.now() > confirmUntil) {
      confirmUntil = Date.now() + CONFIRM_WINDOW_MS;
      resetButton.textContent = 'Tap again to delete your save and start over';
      resetButton.classList.add('is-danger');
      return;
    }
    await save.reset();
    ui.close('menu');
  });

  cleanups.push(
    save.on('status', (s: SaveStatus) => {
      renderStatus();
      if (s.kind === 'saved' && ui.modal === 'menu') {
        status.textContent = `Saved ✓ ${formatTime(s.at)}`;
      }
      if (s.kind === 'loaded') toast('Game loaded');
      if (s.kind === 'reset') toast('New game started');
      if (s.kind === 'error') {
        status.textContent = `Could not save: ${s.message}`;
        toast(`Save problem: ${s.message}`, 'is-error');
      }
    }),
  );

  renderStatus();
  return { elements: [openButton, panel], destroy: () => cleanups.forEach((c) => c()) };
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
