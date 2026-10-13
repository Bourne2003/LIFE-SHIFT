import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/700.css';
import './styles.css';
import { createGame } from './game/createGame';
import { installDebugApi } from './game/debug';

const parent = document.getElementById('game');
if (!parent) throw new Error('Missing #game container');

/**
 * Canvas text is drawn with whatever font is ready at that moment, so load the Thai font first.
 * Bounded wait: on a slow connection the game starts with the system font rather than not at all.
 */
async function loadFonts(timeoutMs = 3000): Promise<void> {
  if (!('fonts' in document)) return;
  const sample = 'กขคก้ำ Aa';
  const loads = ['400', '700'].map((w) =>
    document.fonts.load(`${w} 18px "Noto Sans Thai"`, sample),
  );
  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.allSettled(loads), timeout]);
}

void loadFonts().then(() => {
  const game = createGame(parent);
  if (import.meta.env.DEV) installDebugApi(game);
});
