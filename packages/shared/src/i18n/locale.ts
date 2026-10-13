/** Languages the game ships in. Thai is the primary language. */
export const LOCALES = ['th', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'th';

/** Player-facing text in every supported language. Content must provide all of them. */
export type LocalizedText = Readonly<Record<Locale, string>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Text in `locale`, falling back to the default locale, then to any non-empty translation. */
export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] || text[DEFAULT_LOCALE] || Object.values(text).find(Boolean) || '';
}

/** Locales that are missing or blank in `text` (content validation). */
export function missingLocales(text: LocalizedText | undefined): Locale[] {
  return LOCALES.filter((l) => typeof text?.[l] !== 'string' || text[l].trim() === '');
}
