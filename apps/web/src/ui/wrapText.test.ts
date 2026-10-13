import { describe, expect, it } from 'vitest';
import { wrapText } from './wrapText';

// Monospace stand-in: every grapheme cluster is one unit wide (combining marks are zero-width).
const measure = (s: string) =>
  Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s)).length;

describe('wrapText', () => {
  it('wraps English on spaces', () => {
    expect(wrapText('the quick brown fox', 10, measure, 'en')).toEqual(['the quick', 'brown fox']);
  });

  it('wraps Thai between words even without spaces', () => {
    const lines = wrapText('สวัสดีครับฉันชื่อมีนา', 8, measure);
    expect(lines.join('')).toBe('สวัสดีครับฉันชื่อมีนา');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(8);
    expect(lines).toEqual(['สวัสดีครับ', 'ฉันชื่อมีนา']); // breaks fall between words
  });

  it('never separates a consonant from its vowel and tone marks', () => {
    const lines = wrapText('น้ำน้ำน้ำ', 1, measure);
    expect(lines).toEqual(['น้ำ', 'น้ำ', 'น้ำ']);
  });

  it('keeps explicit line breaks', () => {
    expect(wrapText('ก\nข', 100, measure)).toEqual(['ก', 'ข']);
  });
});
