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
    onComplete: [{ type: 'setFlag', flag: 'somchai-stall-open' }],
  },
};
