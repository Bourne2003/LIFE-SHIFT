type Splitter = (text: string) => string[];

function segmenter(locale: string, granularity: 'word' | 'grapheme'): Splitter | null {
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) return null;
  const s = new Intl.Segmenter(locale, { granularity });
  return (text) => Array.from(s.segment(text), (x) => x.segment);
}

/**
 * Breaks text into lines no wider than `maxWidth`. Thai is written without spaces between words,
 * so plain space-based wrapping (Phaser's default) would never break a Thai sentence; word
 * boundaries come from Intl.Segmenter instead. A word wider than a whole line is split between
 * grapheme clusters, never between a consonant and its vowel or tone marks.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  locale = 'th',
): string[] {
  const words = segmenter(locale, 'word') ?? ((t: string) => t.split(/(?<= )/));
  const graphemes = segmenter(locale, 'grapheme') ?? ((t: string) => Array.from(t));
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    let line = '';
    const pushLine = () => {
      lines.push(line.trimEnd());
      line = '';
    };
    for (const word of words(paragraph)) {
      if (measure(line + word) <= maxWidth) {
        line += word;
        continue;
      }
      if (line.trim() !== '') pushLine();
      const piece = line === '' ? word.trimStart() : word;
      if (measure(piece) <= maxWidth) {
        line = piece;
        continue;
      }
      for (const g of graphemes(piece)) {
        if (line !== '' && measure(line + g) > maxWidth) pushLine();
        line += g;
      }
    }
    pushLine();
  }
  return lines;
}
