import type { NpcDef } from '@life-shift/shared';

export const NPCS: readonly NpcDef[] = [
  {
    id: 'alex',
    name: { th: 'อเล็กซ์', en: 'Alex' },
    xTiles: 12,
    yTiles: 10,
    dialogue: [
      { when: [{ flag: 'clock-tower-fixed' }], dialogue: 'alex-clock' },
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
      { when: [{ weather: 'rain' }], dialogue: 'nida-rain' },
      { when: [{ flag: 'somchai-stall-open' }], dialogue: 'nida-stall' },
      { dialogue: 'nida-greeting' },
    ],
  },
  {
    id: 'pim',
    name: { th: 'พิม', en: 'Pim' },
    xTiles: 10,
    yTiles: 26,
    dialogue: [
      {
        when: [{ quest: 'pims-garland', status: 'active' }, { item: 'jasmine-garland' }],
        dialogue: 'pim-receive',
      },
      { when: [{ quest: 'pims-garland', status: 'active' }], dialogue: 'pim-waiting' },
      {
        when: [{ quest: 'pims-garland', status: 'completed' }, { phase: ['evening', 'night'] }],
        dialogue: 'pim-night',
      },
      { when: [{ quest: 'pims-garland', status: 'completed' }], dialogue: 'pim-after' },
      { dialogue: 'pim-ask' },
    ],
  },
  {
    id: 'daeng',
    name: { th: 'ป้าแดง', en: 'Aunt Daeng' },
    xTiles: 32,
    yTiles: 9,
    dialogue: [{ dialogue: 'daeng-hello' }],
  },
  {
    id: 'boon',
    name: { th: 'ยายบุญ', en: 'Grandma Boon' },
    xTiles: 31,
    yTiles: 25,
    dialogue: [
      { when: [{ quest: 'boons-curry', status: 'active' }], dialogue: 'boon-waiting' },
      { when: [{ quest: 'boons-curry', status: 'completed' }], dialogue: 'boon-after' },
      { dialogue: 'boon-ask' },
    ],
  },
  {
    id: 'chai',
    name: { th: 'ลุงชัย', en: 'Uncle Chai' },
    xTiles: 27,
    yTiles: 17,
    dialogue: [
      {
        when: [
          { quest: 'boons-curry', status: 'active' },
          { item: 'green-curry' },
          { phase: ['evening', 'night'] },
        ],
        dialogue: 'chai-curry',
      },
      {
        when: [{ quest: 'boons-curry', status: 'active' }, { item: 'green-curry' }],
        dialogue: 'chai-curry-early',
      },
      {
        when: [{ quest: 'stopped-clock', status: 'active' }, { item: 'machine-oil' }],
        dialogue: 'chai-oil',
      },
      { when: [{ quest: 'stopped-clock', status: 'active' }], dialogue: 'chai-waiting' },
      { when: [{ quest: 'stopped-clock', status: 'completed' }], dialogue: 'chai-after' },
      { dialogue: 'chai-ask' },
    ],
  },
  {
    id: 'ton',
    name: { th: 'ต้น', en: 'Ton' },
    xTiles: 16,
    yTiles: 10,
    dialogue: [
      { when: [{ quest: 'lost-cat', status: 'active', step: 'tell' }], dialogue: 'ton-found' },
      { when: [{ quest: 'lost-cat', status: 'active' }], dialogue: 'ton-waiting' },
      { when: [{ quest: 'lost-cat', status: 'completed' }], dialogue: 'ton-after' },
      { dialogue: 'ton-ask' },
    ],
  },
  {
    // Ton's cat hides in the alley until the player finds it…
    id: 'som-alley',
    name: { th: 'เจ้าส้ม', en: 'Som' },
    xTiles: 38,
    yTiles: 27,
    look: 'cat',
    presentWhen: [{ flag: 'som-left-alley', is: false }],
    dialogue: [
      { when: [{ quest: 'lost-cat', status: 'active', step: 'find' }], dialogue: 'som-found' },
      { dialogue: 'som-meow' },
    ],
  },
  {
    // …and is back with Ton once the quest is done.
    id: 'som-home',
    name: { th: 'เจ้าส้ม', en: 'Som' },
    xTiles: 17,
    yTiles: 11,
    look: 'cat',
    presentWhen: [{ quest: 'lost-cat', status: 'completed' }],
    dialogue: [{ dialogue: 'som-purr' }],
  },
];
