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
};
