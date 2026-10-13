import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, isLocale, localize, missingLocales } from '../src';

describe('locale helpers', () => {
  it('defaults to Thai', () => {
    expect(DEFAULT_LOCALE).toBe('th');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('th')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('localizes with fallback to the default locale', () => {
    expect(localize({ th: 'สวัสดี', en: 'Hello' }, 'en')).toBe('Hello');
    expect(localize({ th: 'สวัสดี', en: '' }, 'en')).toBe('สวัสดี');
  });

  it('lists missing or blank translations', () => {
    expect(missingLocales({ th: 'ก', en: 'a' })).toEqual([]);
    expect(missingLocales({ th: ' ', en: 'a' })).toEqual(['th']);
    expect(missingLocales(undefined)).toEqual(['th', 'en']);
  });
});
