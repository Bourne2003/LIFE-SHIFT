import type { GameContent } from '@life-shift/shared';
import { DIALOGUES } from './dialogues';
import { NPCS } from './npcs';
import { QUESTS } from './quests';

export { DIALOGUES, NPCS, QUESTS };

/** All authored content of the vertical slice. */
export const CONTENT: GameContent = { npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS };
