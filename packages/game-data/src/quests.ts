import type { QuestCatalog } from '@life-shift/shared';

export const QUESTS: QuestCatalog = {
  'minas-recipe': {
    id: 'minas-recipe',
    title: { th: 'สูตรลับของมีนา', en: "Mina's Recipe" },
    steps: [
      {
        id: 'deliver',
        description: { th: 'นำสูตรอาหารไปให้สมชาย', en: 'Bring the recipe to Somchai' },
      },
      {
        id: 'return',
        description: { th: 'กลับไปบอกมีนาว่าส่งสูตรแล้ว', en: 'Tell Mina the recipe arrived' },
      },
    ],
    // The world remembers: Somchai opens a noodle stall with Mina's recipe.
    onComplete: [
      { type: 'setFlag', flag: 'somchai-stall-open' },
      { type: 'changeMoney', amount: 40 },
    ],
  },
  'pims-garland': {
    id: 'pims-garland',
    title: { th: 'พวงมาลัยของพิม', en: 'A Garland for Pim' },
    steps: [
      {
        id: 'bring',
        description: {
          th: 'ซื้อพวงมาลัยมะลิที่ร้านป้าแดงแล้วนำไปให้พิม',
          en: 'Buy a jasmine garland at Aunt Daeng’s and bring it to Pim',
        },
      },
    ],
    onComplete: [{ type: 'changeMoney', amount: 30 }],
  },
  'stopped-clock': {
    id: 'stopped-clock',
    title: { th: 'หอนาฬิกาที่หยุดเดิน', en: 'The Stopped Clock' },
    steps: [
      {
        id: 'oil',
        description: {
          th: 'ซื้อน้ำมันหล่อลื่นที่ร้านป้าแดงแล้วนำไปให้ลุงชัย',
          en: 'Buy machine oil at Aunt Daeng’s and bring it to Uncle Chai',
        },
      },
    ],
    // The tower clock runs again: its face lights up and people mention the chimes.
    onComplete: [
      { type: 'setFlag', flag: 'clock-tower-fixed' },
      { type: 'changeMoney', amount: 30 },
    ],
  },
  'lost-cat': {
    id: 'lost-cat',
    title: { th: 'แมวหลงทาง', en: 'The Lost Cat' },
    steps: [
      {
        id: 'find',
        description: {
          th: 'ตามหาเจ้าส้ม แมวของต้น (ต้นว่ามันชอบมุดซอยแคบ ๆ หลังร้านยายบุญ)',
          en: 'Find Som, Ton’s cat (Ton says it loves the narrow alley behind Grandma Boon’s)',
        },
      },
      {
        id: 'tell',
        description: { th: 'บอกต้นว่าเจอเจ้าส้มแล้ว', en: 'Tell Ton you found Som' },
      },
    ],
    onComplete: [{ type: 'changeMoney', amount: 20 }],
  },
  'boons-curry': {
    id: 'boons-curry',
    title: { th: 'แกงของยายบุญ', en: 'Grandma Boon’s Curry' },
    steps: [
      {
        id: 'deliver',
        description: {
          th: 'นำแกงเขียวหวานไปให้ลุงชัยที่หอนาฬิกา ตอนเย็นหรือกลางคืน',
          en: 'Take the green curry to Uncle Chai at the clock tower in the evening or at night',
        },
      },
    ],
    onComplete: [{ type: 'changeMoney', amount: 25 }],
  },
};
