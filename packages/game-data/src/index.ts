export type ContentLocale = 'en' | 'th';

export interface LocalizedText {
  readonly en: string;
  readonly th: string;
}

export interface NpcDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly greeting: LocalizedText;
  readonly questId?: string;
  readonly x: number;
  readonly y: number;
}

export interface LandmarkDefinition {
  readonly id: string;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly x: number;
  readonly y: number;
}

export interface CityStructure {
  readonly id: string;
  readonly name: LocalizedText;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number;
}

export const CITY_STRUCTURES: readonly CityStructure[] = [
  {
    id: 'home',
    name: { en: 'Your Home', th: 'บ้านของคุณ' },
    x: 96,
    y: 96,
    width: 192,
    height: 128,
    color: 0x6d597a,
  },
  {
    id: 'market',
    name: { en: 'Market', th: 'ตลาด' },
    x: 992,
    y: 96,
    width: 224,
    height: 128,
    color: 0xb56576,
  },
  {
    id: 'restaurant',
    name: { en: 'Restaurant', th: 'ร้านอาหาร' },
    x: 96,
    y: 704,
    width: 224,
    height: 128,
    color: 0xe09f3e,
  },
  {
    id: 'shop',
    name: { en: 'Corner Shop', th: 'ร้านค้าหัวมุม' },
    x: 992,
    y: 704,
    width: 224,
    height: 128,
    color: 0x457b9d,
  },
];

export interface QuestDefinition {
  readonly id: string;
  readonly title: LocalizedText;
  readonly objective: LocalizedText;
  readonly targetId: string;
  readonly requiresQuestId?: string;
}

export const CITY_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'listen-to-the-city',
    title: { en: 'Listen to the City', th: 'ฟังเสียงของเมือง' },
    objective: { en: 'Find the Old Fountain', th: 'ตามหาน้ำพุเก่า' },
    targetId: 'old-fountain',
  },
  {
    id: 'light-the-park',
    title: { en: 'Light the Park', th: 'จุดไฟให้สวนโคมไฟ' },
    objective: { en: 'Visit Lantern Park', th: 'ไปที่สวนโคมไฟ' },
    targetId: 'park',
    requiresQuestId: 'listen-to-the-city',
  },
];

export const CITY_NPCS: readonly NpcDefinition[] = [
  {
    id: 'mali',
    name: { en: 'Mali', th: 'มะลิ' },
    greeting: {
      en: 'The city feels different every day. Will you help me discover why?',
      th: 'เมืองนี้เปลี่ยนไปทุกวัน ช่วยฉันค้นหาความจริงได้ไหม',
    },
    questId: 'listen-to-the-city',
    x: 560,
    y: 360,
  },
  {
    id: 'chai',
    name: { en: 'Chai', th: 'ชัย' },
    greeting: {
      en: 'The market is quiet today. Maybe the rain knows something we do not.',
      th: 'วันนี้ตลาดเงียบกว่าปกติ บางทีฝนอาจรู้อะไรที่เราไม่รู้',
    },
    x: 880,
    y: 480,
  },
  {
    id: 'dao',
    name: { en: 'Dao', th: 'ดาว' },
    greeting: {
      en: 'I leave the lanterns lit for anyone who needs a little hope.',
      th: 'ฉันจุดโคมไฟไว้ให้คนที่กำลังต้องการความหวังเล็ก ๆ',
    },
    questId: 'light-the-park',
    x: 320,
    y: 400,
  },
  {
    id: 'ton',
    name: { en: 'Ton', th: 'ต้น' },
    greeting: {
      en: 'The market wakes before the sun. You can hear it if you listen.',
      th: 'ตลาดตื่นก่อนดวงอาทิตย์เสมอ ถ้าตั้งใจฟังก็จะได้ยิน',
    },
    x: 1040,
    y: 320,
  },
  {
    id: 'niran',
    name: { en: 'Niran', th: 'นิรันดร์' },
    greeting: {
      en: 'Some doors are easier to open when you know your neighbours.',
      th: 'ประตูบางบานเปิดง่ายขึ้นเมื่อเรารู้จักเพื่อนบ้าน',
    },
    x: 320,
    y: 880,
  },
  {
    id: 'pim',
    name: { en: 'Pim', th: 'พิม' },
    greeting: {
      en: 'The restaurant smells best when the evening breeze turns east.',
      th: 'ร้านอาหารจะหอมที่สุดตอนลมเย็นพัดมาจากทิศตะวันออก',
    },
    x: 400,
    y: 760,
  },
  {
    id: 'lek',
    name: { en: 'Lek', th: 'เล็ก' },
    greeting: {
      en: 'A good bargain is one that leaves both people smiling.',
      th: 'การต่อรองที่ดีคือการที่ทั้งสองฝ่ายยังยิ้มให้กันได้',
    },
    x: 1120,
    y: 280,
  },
  {
    id: 'fah',
    name: { en: 'Fah', th: 'ฟ้า' },
    greeting: {
      en: 'The clocktower keeps time, but the city gives it meaning.',
      th: 'หอนาฬิกาบอกเวลา แต่ผู้คนต่างหากที่ทำให้เมืองมีความหมาย',
    },
    x: 760,
    y: 760,
  },
  {
    id: 'yot',
    name: { en: 'Yot', th: 'ยอด' },
    greeting: {
      en: 'I map the quiet paths so no one gets lost after dark.',
      th: 'ฉันทำแผนที่เส้นทางเงียบ ๆ เพื่อไม่ให้ใครหลงทางหลังตะวันตกดิน',
    },
    x: 1200,
    y: 560,
  },
  {
    id: 'suda',
    name: { en: 'Suda', th: 'สุดา' },
    greeting: {
      en: 'Every neighbourhood has a story hiding just out of sight.',
      th: 'ทุกย่านมีเรื่องราวซ่อนอยู่ตรงมุมที่เราอาจมองข้าม',
    },
    x: 480,
    y: 1040,
  },
];

export const CITY_LANDMARKS: readonly LandmarkDefinition[] = [
  {
    id: 'old-fountain',
    name: { en: 'Old Fountain', th: 'น้ำพุเก่า' },
    description: {
      en: 'A forgotten fountain hums beneath the city noise.',
      th: 'น้ำพุเก่าที่ถูกลืมส่งเสียงแผ่วเบาอยู่ท่ามกลางความวุ่นวาย',
    },
    x: 1040,
    y: 560,
  },
  {
    id: 'park',
    name: { en: 'Lantern Park', th: 'สวนโคมไฟ' },
    description: {
      en: 'Lanterns wait for dusk, each one carrying a small wish.',
      th: 'โคมไฟรอเวลาพลบค่ำ แต่ละดวงเก็บคำอธิษฐานเล็ก ๆ เอาไว้',
    },
    x: 320,
    y: 560,
  },
  {
    id: 'hidden-garden',
    name: { en: 'Hidden Garden', th: 'สวนลับ' },
    description: {
      en: 'Wild flowers have reclaimed a forgotten corner of the city.',
      th: 'ดอกไม้ป่าเข้ายึดครองมุมเมืองที่ถูกลืมจนกลายเป็นสวนลับ',
    },
    x: 640,
    y: 1040,
  },
  {
    id: 'clocktower',
    name: { en: 'Old Clocktower', th: 'หอนาฬิกาเก่า' },
    description: {
      en: 'Its patient bell marks a rhythm the busy streets cannot hear.',
      th: 'ระฆังอันอดทนของหอนาฬิกายังคงบอกจังหวะที่ถนนอันวุ่นวายไม่ได้ยิน',
    },
    x: 760,
    y: 640,
  },
];

export function textForLocale(text: LocalizedText, locale: ContentLocale): string {
  return text[locale] || text.en;
}

/**
 * Content must ship in every supported locale. Keep narrative data out of Phaser
 * so the future server can use exactly the same text and keys.
 */
export function assertLocalizedText(text: LocalizedText, id: string): void {
  if (!text.en.trim() || !text.th.trim()) {
    throw new Error(`Missing localized content for "${id}"`);
  }
}
