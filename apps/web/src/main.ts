import './styles.css';
import { loadContent } from '@life-shift/game-data';
import { createGame } from './game/createGame';
import { installDebugApi } from './game/debug';
import { LocalSaveStorage, readInitialSave } from './game/SaveService';
import { createServices } from './game/services';
import { mountUi } from './ui/mountUi';

async function start(): Promise<void> {
  const parent = document.getElementById('game');
  const uiRoot = document.getElementById('ui');
  if (!parent || !uiRoot) throw new Error('Missing #game or #ui container');

  const content = loadContent();
  const storage = new LocalSaveStorage();
  // Continue where the player left off; a missing or unreadable save simply means a new game.
  const initial = await readInitialSave(storage, content);
  if (initial.error) console.warn(`Starting a new game: ${initial.error}`);
  for (const warning of initial.warnings) console.warn(`Save: ${warning}`);

  const services = createServices(content, {
    storage,
    ...(initial.save ? { save: initial.save } : {}),
  });
  const game = createGame(parent, services);
  mountUi(uiRoot, services);

  services.save.enableAutosave();
  // Also save when the tab is hidden or closed — the last reliable moment on mobile.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void services.save.save();
  });

  if (import.meta.env.DEV) installDebugApi(game, services);
}

void start();
