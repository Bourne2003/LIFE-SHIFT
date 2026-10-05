export type Locale = 'en' | 'th';

export type TranslationKey =
  | 'controls.touch'
  | 'controls.keyboard'
  | 'controls.interact'
  | 'settings.language'
  | 'settings.languageEnglish'
  | 'settings.languageThai'
  | 'world.morning'
  | 'world.day'
  | 'world.evening'
  | 'world.night'
  | 'world.clear'
  | 'world.rain'
  | 'objective.explore'
  | 'objective.findLandmark'
  | 'objective.complete'
  | 'objective.findPark'
  | 'objective.completeLanterns'
  | 'app.ariaLabel'
  | 'app.description';

type TranslationCatalog = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationCatalog> = {
  en: {
    'controls.touch': 'Drag on the left side to move',
    'controls.keyboard': 'WASD / Arrow keys to move',
    'controls.interact': 'Interact · E',
    'settings.language': 'Language',
    'settings.languageEnglish': 'English',
    'settings.languageThai': 'ไทย',
    'world.morning': 'Morning',
    'world.day': 'Day',
    'world.evening': 'Evening',
    'world.night': 'Night',
    'world.clear': 'Clear',
    'world.rain': 'Rain',
    'objective.explore': 'Objective: Explore the city and find someone interesting.',
    'objective.findLandmark': 'Objective: Find the Old Fountain',
    'objective.complete': 'Objective complete: The city has more secrets than you thought.',
    'objective.findPark': 'Objective: Visit Lantern Park',
    'objective.completeLanterns': 'Objective complete: The park is glowing again.',
    'app.ariaLabel': 'LIFE SHIFT game',
    'app.description': 'LIFE SHIFT — live your life, change the world.',
  },
  th: {
    'controls.touch': 'ลากนิ้วบนด้านซ้ายของหน้าจอเพื่อเคลื่อนที่',
    'controls.keyboard': 'ใช้ปุ่ม WASD หรือปุ่มลูกศรเพื่อเคลื่อนที่',
    'controls.interact': 'โต้ตอบ · E',
    'settings.language': 'ภาษา',
    'settings.languageEnglish': 'English',
    'settings.languageThai': 'ไทย',
    'world.morning': 'เช้า',
    'world.day': 'กลางวัน',
    'world.evening': 'เย็น',
    'world.night': 'กลางคืน',
    'world.clear': 'ท้องฟ้าแจ่มใส',
    'world.rain': 'ฝนตก',
    'objective.explore': 'เป้าหมาย: สำรวจเมืองและพบใครสักคนที่น่าสนใจ',
    'objective.findLandmark': 'ภารกิจ: ไปค้นหาน้ำพุเก่า',
    'objective.complete': 'ภารกิจสำเร็จ: เมืองนี้มีความลับมากกว่าที่คิด',
    'objective.findPark': 'ภารกิจ: ไปที่สวนโคมไฟ',
    'objective.completeLanterns': 'ภารกิจสำเร็จ: สวนกลับมาส่องสว่างอีกครั้ง',
    'app.ariaLabel': 'เกม LIFE SHIFT',
    'app.description': 'LIFE SHIFT — ใช้ชีวิตของคุณ เปลี่ยนแปลงโลก',
  },
};

const DEFAULT_LOCALE: Locale = 'en';
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'th'];
const LOCALE_STORAGE_KEY = 'life-shift.locale';

function asLocale(value: string | null | undefined): Locale | undefined {
  if (!value) return undefined;
  const language = value.toLowerCase().split(/[-_]/u)[0];
  return language === 'th' || language === 'en' ? language : undefined;
}

/**
 * Resolves an explicit locale first, then the browser's preferred languages.
 * Keeping this pure makes locale selection deterministic and easy to test.
 */
export function resolveLocale(
  explicitLocale: string | undefined,
  preferredLanguages: readonly string[] = [],
): Locale {
  return (
    asLocale(explicitLocale) ??
    preferredLanguages.map(asLocale).find((locale): locale is Locale => locale !== undefined) ??
    DEFAULT_LOCALE
  );
}

export function createTranslator(locale: Locale): (key: TranslationKey) => string {
  return (key) => translations[locale][key] ?? translations[DEFAULT_LOCALE][key];
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US').format(value);
}

export function formatDate(locale: Locale, value: Date): string {
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
  }).format(value);
}

export function formatCurrency(locale: Locale, value: number, currency = 'THB'): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Selects the locale without coupling the game scenes to URL or Vite APIs.
 * Query-string selection is useful for QA and sharing a language-specific link;
 * VITE_LOCALE is useful for deployments that need a fixed default.
 */
export function getInitialLocale(
  search: string,
  configuredLocale: string | undefined,
  preferredLanguages: readonly string[],
  storedLocale?: string,
): Locale {
  const queryLocale = asLocale(new URLSearchParams(search).get('lang'));
  return resolveLocale(queryLocale ?? storedLocale ?? configuredLocale, preferredLanguages);
}

export function readStoredLocale(storage?: Pick<Storage, 'getItem'>): Locale | undefined {
  try {
    return asLocale((storage ?? window.localStorage).getItem(LOCALE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function writeStoredLocale(locale: Locale, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? window.localStorage).setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The game remains usable when browser storage is unavailable.
  }
}

export function urlForLocale(
  locale: Locale,
  location: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location,
): string {
  const params = new URLSearchParams(location.search);
  params.set('lang', locale);
  return `${location.pathname}?${params.toString()}${location.hash}`;
}

export function applyDocumentLocale(
  locale: Locale,
  translate: (key: TranslationKey) => string,
): void {
  document.documentElement.lang = locale === 'th' ? 'th' : 'en';
  document.title = 'LIFE SHIFT';

  const game = document.getElementById('game');
  game?.setAttribute('aria-label', translate('app.ariaLabel'));

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  description?.setAttribute('content', translate('app.description'));
}
