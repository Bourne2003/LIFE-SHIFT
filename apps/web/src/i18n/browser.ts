import type { Locale } from '@life-shift/shared';
import { LocaleService, initialLocale } from './LocaleService';

const STORAGE_KEY = 'life-shift.locale';

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe): just use the default
  }
}

function save(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not persisted; the choice still applies for this session.
  }
}

/** Creates the locale service for this page and keeps <html lang> and the saved choice in sync. */
export function createBrowserLocale(): LocaleService {
  const service = new LocaleService(initialLocale(window.location.search, readSaved()));
  const apply = (locale: Locale) => {
    document.documentElement.lang = locale;
  };
  apply(service.locale);
  service.on((locale) => {
    apply(locale);
    save(locale);
  });
  return service;
}
