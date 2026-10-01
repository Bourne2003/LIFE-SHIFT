import type { GameServices } from '../game/services';
import type { SaveStatus } from '../game/SaveService';
import { el } from './dom';

const CONFIRM_WINDOW_MS = 4000;

/**
 * Game menu: save, load the last save, start a new game. Gameplay pauses while it is open
 * (services.ui.menuOpen). "New game" needs a second tap to confirm, since it deletes the save.
 */
export function mountMenu(
  services: GameServices,
  toast: (text: string, kind?: string) => void,
  onToggle: (open: boolean) => void,
): { elements: HTMLElement[]; destroy: () => void } {
  const { save, ui } = services;
  const cleanups: (() => void)[] = [];

  const openButton = el(
    'button',
    {
      className: 'ui-menu-button',
      attrs: { type: 'button', 'aria-label': 'Menu', 'data-testid': 'menu-button' },
    },
    ['☰'],
  );

  const status = el('p', { className: 'ui-menu__status', attrs: { 'data-testid': 'save-status' } });
  const button = (label: string, testId: string) =>
    el('button', { className: 'ui-menu__item', attrs: { type: 'button', 'data-testid': testId } }, [
      label,
    ]);
  const saveButton = button('Save game', 'menu-save');
  const loadButton = button('Load last save', 'menu-load');
  const resetButton = button('New game', 'menu-reset');
  const closeButton = button('Resume', 'menu-close');

  const panel = el(
    'section',
    {
      className: 'ui-menu ui-panel is-hidden',
      attrs: { role: 'dialog', 'aria-label': 'Menu', 'data-testid': 'menu' },
    },
    [
      el('h2', { className: 'ui-menu__title', text: 'Menu' }),
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

  const setOpen = (open: boolean) => {
    ui.menuOpen = open;
    panel.classList.toggle('is-hidden', !open);
    openButton.setAttribute('aria-expanded', String(open));
    resetConfirm();
    onToggle(open);
    if (open) {
      renderStatus();
      saveButton.focus();
    } else openButton.focus();
  };

  openButton.addEventListener('click', () => setOpen(!ui.menuOpen));
  closeButton.addEventListener('click', () => setOpen(false));
  saveButton.addEventListener('click', () => void save.save());
  loadButton.addEventListener('click', async () => {
    if (await save.load()) setOpen(false);
  });
  resetButton.addEventListener('click', async () => {
    if (Date.now() > confirmUntil) {
      confirmUntil = Date.now() + CONFIRM_WINDOW_MS;
      resetButton.textContent = 'Tap again to delete your save and start over';
      resetButton.classList.add('is-danger');
      return;
    }
    await save.reset();
    setOpen(false);
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && ui.menuOpen) setOpen(false);
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  cleanups.push(
    save.on('status', (s: SaveStatus) => {
      renderStatus();
      if (s.kind === 'saved' && ui.menuOpen) status.textContent = `Saved ✓ ${formatTime(s.at)}`;
      if (s.kind === 'loaded') toast('Game loaded');
      if (s.kind === 'reset') toast('New game started');
      if (s.kind === 'error') {
        status.textContent = `Could not save: ${s.message}`;
        toast(`Save problem: ${s.message}`, 'is-error');
      }
    }),
  );

  renderStatus();
  return {
    elements: [openButton, panel],
    destroy: () => {
      cleanups.forEach((c) => c());
      ui.menuOpen = false;
    },
  };
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
