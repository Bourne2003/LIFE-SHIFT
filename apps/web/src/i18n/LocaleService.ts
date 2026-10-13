import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localize,
  type Locale,
  type LocalizedText,
} from '@life-shift/shared';
import { UI_STRINGS, type UiStrings } from './strings';

/**
 * Picks the starting language: `?lang=` in the URL wins (handy for sharing and tests), then the
 * player's saved choice, then the default (Thai).
 */
export function initialLocale(search: string, saved: string | null): Locale {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isLocale(fromUrl)) return fromUrl;
  if (isLocale(saved)) return saved;
  return DEFAULT_LOCALE;
}

/** The current language for UI and content text. Engine-free; scenes subscribe to changes. */
export class LocaleService {
  private current: Locale;
  private readonly listeners = new Set<(locale: Locale) => void>();

  constructor(initial: Locale) {
    this.current = initial;
  }

  get locale(): Locale {
    return this.current;
  }

  /** UI strings in the current language. */
  get ui(): UiStrings {
    return UI_STRINGS[this.current];
  }

  /** Content text (NPC names, dialogue, quests) in the current language. */
  text(text: LocalizedText): string {
    return localize(text, this.current);
  }

  set(locale: Locale): void {
    if (locale === this.current) return;
    this.current = locale;
    for (const listener of this.listeners) listener(locale);
  }

  /** Switches to the next supported language. */
  cycle(): void {
    const i = LOCALES.indexOf(this.current);
    this.set(LOCALES[(i + 1) % LOCALES.length]!);
  }

  /** Subscribes to language changes; returns an unsubscribe function. */
  on(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
