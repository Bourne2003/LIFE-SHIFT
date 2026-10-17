import type { GameContent } from '@life-shift/shared';
import { DIALOGUES } from './dialogues';
import { ITEMS, SHOPS } from './items';
import { NPCS } from './npcs';
import { PROPS } from './props';
import { QUESTS } from './quests';

export { DIALOGUES, ITEMS, NPCS, PROPS, QUESTS, SHOPS };

/** All authored content of the vertical slice. */
export const CONTENT: GameContent = {
  npcs: NPCS,
  dialogues: DIALOGUES,
  quests: QUESTS,
  props: PROPS,
  items: ITEMS,
  shops: SHOPS,
};
