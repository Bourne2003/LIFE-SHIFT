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
  money(amount: number): string;
  readonly bagButton: string;
  readonly bagTitle: string;
  readonly bagEmpty: string;
  readonly bagHintKeyboard: string;
  owned(count: number): string;
  readonly buyButton: string;
  readonly closeButton: string;
  readonly shopHintKeyboard: string;
  readonly shopHintTouch: string;
  bought(item: string, price: number): string;
  cannotAfford(item: string): string;
  moneyReceived(amount: number): string;
  clock(day: number, time: string): string;
  readonly weatherClear: string;
  readonly weatherRain: string;
  secretFound(place: string): string;
  readonly sellButton: string;
  readonly toSellMode: string;
  readonly toBuyMode: string;
  readonly sellEmpty: string;
  sold(item: string, price: number): string;
  readonly menuButton: string;
  readonly pausedTitle: string;
  pausedSummary(day: number, money: string, done: number, total: number): string;
  readonly resumeButton: string;
  readonly newGameButton: string;
  readonly newGameWarning: string;
  readonly confirmNewGame: string;
  readonly cancelButton: string;
  readonly pauseHintKeyboard: string;
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
    money: (n) => `฿${n}`,
    bagButton: 'กระเป๋า',
    bagTitle: 'กระเป๋าของฉัน',
    bagEmpty: 'ยังไม่มีของในกระเป๋า',
    bagHintKeyboard: 'กด I หรือ Esc เพื่อปิด',
    owned: (n) => `มีอยู่ ${n}`,
    buyButton: 'ซื้อ',
    closeButton: 'ปิด',
    shopHintKeyboard: 'ลูกศรเพื่อเลือก · E ยืนยัน · Tab สลับซื้อ/ขาย · Esc ปิด',
    shopHintTouch: 'แตะสินค้าเพื่อเลือก แล้วกดปุ่มยืนยัน',
    bought: (item, price) => `ซื้อ${item}แล้ว (−฿${price})`,
    cannotAfford: (item) => `เงินไม่พอซื้อ${item}`,
    moneyReceived: (n) => `ได้รับเงิน ฿${n}`,
    clock: (day, time) => `วันที่ ${day} · ${time} น.`,
    weatherClear: 'อากาศแจ่มใส',
    weatherRain: 'ฝนตก',
    secretFound: (place) => `ค้นพบสถานที่ลับ: ${place}`,
    sellButton: 'ขาย',
    toSellMode: 'ขายของ',
    toBuyMode: 'ซื้อของ',
    sellEmpty: 'ไม่มีของที่ร้านนี้รับซื้อ',
    sold: (item, price) => `ขาย${item}แล้ว (+฿${price})`,
    menuButton: 'เมนู',
    pausedTitle: 'หยุดเกมชั่วคราว',
    pausedSummary: (day, money, done, total) =>
      `วันที่ ${day} · ${money} · ทำเควสต์สำเร็จ ${done}/${total}`,
    resumeButton: 'เล่นต่อ',
    newGameButton: 'เริ่มเกมใหม่',
    newGameWarning: 'การเริ่มใหม่จะลบความคืบหน้าทั้งหมดในเครื่องนี้ แน่ใจหรือไม่?',
    confirmNewGame: 'ยืนยัน เริ่มใหม่',
    cancelButton: 'ยกเลิก',
    pauseHintKeyboard: 'กด Esc เพื่อเล่นต่อ',
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
    money: (n) => `฿${n}`,
    bagButton: 'Bag',
    bagTitle: 'My bag',
    bagEmpty: 'Your bag is empty.',
    bagHintKeyboard: 'I or Esc to close',
    owned: (n) => `Owned: ${n}`,
    buyButton: 'Buy',
    closeButton: 'Close',
    shopHintKeyboard: 'Arrows to choose · E to confirm · Tab buy/sell · Esc to close',
    shopHintTouch: 'Tap an item, then the confirm button',
    bought: (item, price) => `Bought ${item} (−฿${price})`,
    cannotAfford: (item) => `Not enough money for ${item}`,
    moneyReceived: (n) => `Received ฿${n}`,
    clock: (day, time) => `Day ${day} · ${time}`,
    weatherClear: 'Clear',
    weatherRain: 'Rain',
    secretFound: (place) => `Secret place found: ${place}`,
    sellButton: 'Sell',
    toSellMode: 'Sell items',
    toBuyMode: 'Buy items',
    sellEmpty: 'Nothing this shop will buy',
    sold: (item, price) => `Sold ${item} (+฿${price})`,
    menuButton: 'Menu',
    pausedTitle: 'Paused',
    pausedSummary: (day, money, done, total) =>
      `Day ${day} · ${money} · Quests done ${done}/${total}`,
    resumeButton: 'Resume',
    newGameButton: 'New game',
    newGameWarning: 'Starting over erases all progress on this device. Are you sure?',
    confirmNewGame: 'Yes, start over',
    cancelButton: 'Cancel',
    pauseHintKeyboard: 'Esc to resume',
  },
};
