import type { NpcDef } from '@life-shift/shared';

export const NPCS: readonly NpcDef[] = [
  { id: 'alex', name: 'Alex', xTiles: 12, yTiles: 10, dialogue: [{ dialogue: 'alex-greeting' }] },
  {
    id: 'mina',
    name: 'Mina',
    xTiles: 18,
    yTiles: 8,
    dialogue: [
      { when: [{ quest: 'minas-recipe', status: 'notStarted' }], dialogue: 'mina-offer' },
      {
        when: [{ quest: 'minas-recipe', status: 'active', step: 'deliver' }],
        dialogue: 'mina-waiting',
      },
      {
        when: [{ quest: 'minas-recipe', status: 'active', step: 'return' }],
        dialogue: 'mina-thanks',
      },
      { dialogue: 'mina-after' },
    ],
  },
  {
    id: 'somchai',
    name: 'Somchai',
    xTiles: 23,
    yTiles: 18,
    dialogue: [
      {
        when: [{ quest: 'minas-recipe', status: 'active', step: 'deliver' }],
        dialogue: 'somchai-receive',
      },
      { dialogue: 'somchai-greeting' },
    ],
  },
  { id: 'nida', name: 'Nida', xTiles: 32, yTiles: 12, dialogue: [{ dialogue: 'nida-greeting' }] },
  { id: 'pim', name: 'Pim', xTiles: 10, yTiles: 26, dialogue: [{ dialogue: 'pim-greeting' }] },
];
