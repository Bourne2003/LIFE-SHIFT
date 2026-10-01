import type {
  DialogueDef,
  GameContent,
  MapDef,
  NpcDef,
  QuestDef,
  WorldObjectDef,
} from '@life-shift/shared';
import town from './maps/town.json';
import npcs from './npcs.json';
import objects from './objects.json';
import quests from './quests.json';
import art from './dialogues/art.json';
import bun from './dialogues/bun.json';
import dao from './dialogues/dao.json';
import ken from './dialogues/ken.json';
import lek from './dialogues/lek.json';
import mali from './dialogues/mali.json';
import nina from './dialogues/nina.json';
import noi from './dialogues/noi.json';
import ploy from './dialogues/ploy.json';
import restaurantSign from './dialogues/restaurant_sign.json';
import somchai from './dialogues/somchai.json';
import { validateContent } from './validate';

export { validateContent };

// JSON imports are typed loosely (string instead of string literal unions); validateContent()
// is what actually guarantees they match the schema's references and rules.
const dialogueFiles = [
  art,
  bun,
  dao,
  ken,
  lek,
  mali,
  nina,
  noi,
  ploy,
  restaurantSign,
  somchai,
] as unknown as DialogueDef[][];

/** Assembles the shipped content without validating it (see loadContent). */
export function rawContent(): GameContent {
  return {
    map: town as unknown as MapDef,
    npcs: npcs as unknown as NpcDef[],
    objects: objects as unknown as WorldObjectDef[],
    dialogues: Object.fromEntries(dialogueFiles.flat().map((d) => [d.id, d])),
    quests: Object.fromEntries((quests as unknown as QuestDef[]).map((q) => [q.id, q])),
  };
}

/** The game's content, validated. Throws listing every problem if the data is broken. */
export function loadContent(): GameContent {
  const content = rawContent();
  const errors = validateContent(content);
  if (errors.length > 0) {
    throw new Error(`Invalid game content:\n- ${errors.join('\n- ')}`);
  }
  return content;
}
