import type { WorldPropDef } from '@life-shift/shared';

export const PROPS: readonly WorldPropDef[] = [
  {
    // Appears once Mina's recipe reaches Somchai and the quest is done.
    id: 'somchai-noodle-stall',
    kind: 'noodle-stall',
    xTiles: 24,
    yTiles: 17,
    widthTiles: 2,
    heightTiles: 2,
    when: [{ flag: 'somchai-stall-open' }],
  },
  // Park lanterns are lit from evening until dawn (Pim talks about them).
  ...[8, 12].map((x): WorldPropDef => ({
    id: `park-lantern-${x}`,
    kind: 'lantern',
    xTiles: x,
    yTiles: 26,
    widthTiles: 1,
    heightTiles: 1,
    when: [{ phase: ['evening', 'night'] }],
  })),
];
