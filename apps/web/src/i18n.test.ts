import { describe, expect, it } from 'vitest';
import {
  createTranslator,
  formatCurrency,
  formatDate,
  formatNumber,
  getInitialLocale,
  readStoredLocale,
  writeStoredLocale,
  resolveLocale,
} from './i18n';

describe('locale resolution', () => {
  it('prefers an explicit supported locale', () => {
    expect(resolveLocale('th-TH', ['en-US'])).toBe('th');
  });

  it('accepts regional browser language tags', () => {
    expect(resolveLocale(undefined, ['ja-JP', 'th-TH'])).toBe('th');
  });

  it('falls back to English for unsupported languages', () => {
    expect(resolveLocale('ja', ['ko'])).toBe('en');
  });

  it('gives the URL locale precedence over the configured locale', () => {
    expect(getInitialLocale('?lang=th', 'en', ['en-US'])).toBe('th');
  });

  it('ignores unsupported and malformed URL locale values', () => {
    expect(getInitialLocale('?lang=ja', 'en', ['th-TH'])).toBe('en');
    expect(getInitialLocale('?lang=%E0%A4%A', undefined, ['th-TH'])).toBe('th');
  });

  it('prefers a saved player choice over deployment and browser defaults', () => {
    expect(getInitialLocale('', 'en', ['en-US'], 'th')).toBe('th');
  });

  it('round-trips a saved locale', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    writeStoredLocale('th', storage);
    expect(readStoredLocale(storage)).toBe('th');
  });
});

describe('translation catalog', () => {
  it('contains natural Thai control copy', () => {
    const translate = createTranslator('th');
    expect(translate('controls.touch')).toBe('ลากนิ้วบนด้านซ้ายของหน้าจอเพื่อเคลื่อนที่');
    expect(translate('controls.keyboard')).toBe('ใช้ปุ่ม WASD หรือปุ่มลูกศรเพื่อเคลื่อนที่');
  });

  it('formats game values with locale-aware Intl rules', () => {
    expect(formatNumber('th', 1234567)).toContain('1,234,567');
    expect(formatCurrency('th', 99, 'THB')).toContain('฿');
    expect(formatDate('th', new Date(2026, 0, 2))).toContain('2569');
  });
});
