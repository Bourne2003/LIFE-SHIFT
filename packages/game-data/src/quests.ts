import type { QuestCatalog } from '@life-shift/shared';

export const QUESTS: QuestCatalog = {
  'minas-recipe': {
    id: 'minas-recipe',
    title: "Mina's Recipe",
    steps: [
      { id: 'deliver', description: 'Bring the recipe to Somchai' },
      { id: 'return', description: 'Tell Mina the recipe arrived' },
    ],
  },
};
