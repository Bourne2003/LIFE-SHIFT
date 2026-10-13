import type { NpcDef } from '@life-shift/shared';

export const NPCS: readonly NpcDef[] = [
  {
    id: 'alex',
    name: { th: 'อเล็กซ์', en: 'Alex' },
    xTiles: 12,
    yTiles: 10,
    dialogue: [
      { when: [{ flag: 'somchai-stall-open' }], dialogue: 'alex-stall' },
      { when: [{ npc: 'alex', met: true }], dialogue: 'alex-again' },
      { dialogue: 'alex-greeting' },
    ],
  },
  {
    id: 'mina',
    name: { th: 'มีนา', en: 'Mina' },
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
    name: { th: 'สมชาย', en: 'Somchai' },
    xTiles: 23,
    yTiles: 18,
    dialogue: [
      {
        when: [{ quest: 'minas-recipe', status: 'active', step: 'deliver' }],
        dialogue: 'somchai-receive',
      },
      { when: [{ flag: 'somchai-stall-open' }], dialogue: 'somchai-stall' },
      { dialogue: 'somchai-greeting' },
    ],
  },
  {
    id: 'nida',
    name: { th: 'นิดา', en: 'Nida' },
    xTiles: 32,
    yTiles: 12,
    dialogue: [
      { when: [{ flag: 'somchai-stall-open' }], dialogue: 'nida-stall' },
      { dialogue: 'nida-greeting' },
    ],
  },
  {
    id: 'pim',
    name: { th: 'พิม', en: 'Pim' },
    xTiles: 10,
    yTiles: 26,
    dialogue: [{ dialogue: 'pim-greeting' }],
  },
];
