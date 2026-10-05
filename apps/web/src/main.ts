import './styles.css';
import { createGame } from './game/createGame';
import { installDebugApi } from './game/debug';
import {
  applyDocumentLocale,
  createTranslator,
  getInitialLocale,
  readStoredLocale,
  urlForLocale,
  writeStoredLocale,
} from './i18n';

const parent = document.getElementById('game');
if (!parent) throw new Error('Missing #game container');

let browserStorage: Storage | undefined;
try {
  browserStorage = window.localStorage;
} catch {
  // Private browsing and strict privacy settings can disable localStorage.
}

const locale = getInitialLocale(
  window.location.search,
  import.meta.env.VITE_LOCALE,
  navigator.languages.length > 0 ? navigator.languages : [navigator.language],
  readStoredLocale(browserStorage),
);
const translate = createTranslator(locale);
applyDocumentLocale(locale, translate);

const languageControl = document.createElement('button');
languageControl.id = 'language-control';
languageControl.type = 'button';
languageControl.textContent = `${translate('settings.language')}: ${
  locale === 'th' ? translate('settings.languageThai') : translate('settings.languageEnglish')
}`;
languageControl.setAttribute('aria-label', translate('settings.language'));
languageControl.addEventListener('click', () => {
  const nextLocale = locale === 'th' ? 'en' : 'th';
  writeStoredLocale(nextLocale, browserStorage);
  window.location.href = urlForLocale(nextLocale);
});
parent.append(languageControl);

const interactControl = document.createElement('button');
interactControl.id = 'interact-control';
interactControl.type = 'button';
interactControl.textContent = translate('controls.interact');
interactControl.setAttribute('aria-label', translate('controls.interact'));
interactControl.addEventListener('click', () => {
  window.dispatchEvent(new Event('life-shift-interact'));
});
parent.append(interactControl);

const game = createGame(parent);

if (import.meta.env.DEV) installDebugApi(game);
