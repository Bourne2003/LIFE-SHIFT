import type Phaser from 'phaser';
import { wrapText } from './wrapText';

/** Self-hosted (see main.ts), so Thai renders the same on every device. */
export const FONT_FAMILY = '"Noto Sans Thai", system-ui, sans-serif';

/** Base text style for all screen-space UI. */
export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: '18px',
  color: '#ffffff',
  // Phaser sizes text from this sample. Include Thai stacked vowel/tone marks (ปั้) and descenders
  // (ญ ฐ ู) so they are not clipped at the top or bottom of the text box.
  testString: '|MÉqgyปั้ญฐู',
};

/**
 * Makes `text` wrap at `width` using language-aware word boundaries (see wrapText) instead of
 * Phaser's space-only wrapping, which cannot wrap Thai.
 */
export function setSmartWrap(
  text: Phaser.GameObjects.Text,
  width: number,
  locale: () => string,
): Phaser.GameObjects.Text {
  text.setWordWrapCallback((content: string, obj: Phaser.GameObjects.Text) =>
    wrapText(
      content,
      obj.style.wordWrapWidth ?? Number.POSITIVE_INFINITY,
      (s) => obj.context.measureText(s).width,
      locale(),
    ),
  );
  return text.setWordWrapWidth(width);
}
