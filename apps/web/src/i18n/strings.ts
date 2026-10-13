import type { Locale } from '@life-shift/shared';

/** Every piece of UI text. The Record type makes a missing translation a compile error. */
export interface UiStrings {
  readonly moveHintKeyboard: string;
  readonly moveHintTouch: string;
  talkPrompt(name: string): string;
  readonly talkButton: string;
  readonly continueKeyboard: string;
  readonly continueTouch: string;
  questStarted(title: string): string;
  questCompleted(title: string): string;
  /** Label of the button that switches to the *other* language. */
  readonly switchLanguage: string;
  readonly switchLanguageAria: string;
}

export const UI_STRINGS: Readonly<Record<Locale, UiStrings>> = {
  th: {
    moveHintKeyboard: 'WASD / ปุ่มลูกศร เพื่อเดิน · กด E เพื่อคุย',
    moveHintTouch: 'ลากนิ้วทางซ้ายของจอเพื่อเดิน · แตะ “คุย” เมื่ออยู่ใกล้ผู้คน',
    talkPrompt: (name) => `E  คุยกับ${name}`,
    talkButton: 'คุย',
    continueKeyboard: 'กด E / Space เพื่อไปต่อ',
    continueTouch: 'แตะเพื่อไปต่อ',
    questStarted: (title) => `เควสต์ใหม่: ${title}`,
    questCompleted: (title) => `ทำเควสต์สำเร็จ: ${title}`,
    switchLanguage: 'EN',
    switchLanguageAria: 'Switch to English',
  },
  en: {
    moveHintKeyboard: 'WASD / Arrow keys to move · E to talk',
    moveHintTouch: 'Drag on the left side to move · Tap Talk near people',
    talkPrompt: (name) => `E  Talk to ${name}`,
    talkButton: 'Talk',
    continueKeyboard: 'E / Space to continue',
    continueTouch: 'Tap to continue',
    questStarted: (title) => `New quest: ${title}`,
    questCompleted: (title) => `Quest complete: ${title}`,
    switchLanguage: 'ไทย',
    switchLanguageAria: 'เปลี่ยนเป็นภาษาไทย',
  },
};
