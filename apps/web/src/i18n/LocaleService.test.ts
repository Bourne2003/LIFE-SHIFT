import { describe, expect, it } from 'vitest';
import { LOCALES } from '@life-shift/shared';
import { LocaleService, initialLocale } from './LocaleService';
import { UI_STRINGS } from './strings';

describe('initialLocale', () => {
  it('prefers the URL, then the saved choice, then Thai', () => {
    expect(initialLocale('?lang=en', 'th')).toBe('en');
    expect(initialLocale('?lang=xx', 'en')).toBe('en');
    expect(initialLocale('', null)).toBe('th');
    expect(initialLocale('', 'garbage')).toBe('th');
  });
});

describe('LocaleService', () => {
  it('switches language, notifies and localizes text', () => {
    const service = new LocaleService('th');
    const seen: string[] = [];
    service.on((l) => seen.push(l));
    const text = { th: 'สวัสดี', en: 'Hello' };
    expect(service.text(text)).toBe('สวัสดี');
    expect(service.ui.talkButton).toBe('คุย');

    service.cycle();
    expect(service.locale).toBe('en');
    expect(service.text(text)).toBe('Hello');
    service.set('en'); // no change, no event
    service.cycle();
    expect(seen).toEqual(['en', 'th']);
  });
});

describe('UI strings', () => {
  it('are complete and non-empty in every locale', () => {
    const keys = Object.keys(UI_STRINGS.en).sort();
    for (const locale of LOCALES) {
      const strings = UI_STRINGS[locale];
      expect(Object.keys(strings).sort(), locale).toEqual(keys);
      for (const [key, value] of Object.entries(strings)) {
        const text =
          typeof value === 'function' ? (value as (...a: unknown[]) => string)('X', 1) : value;
        expect(String(text).trim(), `${locale}.${key}`).not.toBe('');
      }
    }
  });

  it('are actually translated (Thai strings contain Thai script)', () => {
    const thai = /[฀-๿]/;
    for (const [key, value] of Object.entries(UI_STRINGS.th)) {
      // These name the other language, or are just a currency sign and a number.
      if (['switchLanguage', 'switchLanguageAria', 'money'].includes(key)) continue;
      const text =
        typeof value === 'function' ? (value as (...a: unknown[]) => string)('X', 1) : value;
      expect(text, key).toMatch(thai);
    }
  });
});
