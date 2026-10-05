import { describe, expect, it } from 'vitest';
import {
  assertLocalizedText,
  CITY_LANDMARKS,
  CITY_NPCS,
  CITY_QUESTS,
  CITY_STRUCTURES,
  textForLocale,
  type LocalizedText,
} from './index';

describe('localized content', () => {
  const greeting: LocalizedText = { en: 'Hello', th: 'สวัสดี' };

  it('selects the requested locale', () => {
    expect(textForLocale(greeting, 'th')).toBe('สวัสดี');
  });

  it('rejects missing translations', () => {
    expect(() => assertLocalizedText({ en: 'Hello', th: ' ' }, 'greeting')).toThrow(
      'Missing localized content for "greeting"',
    );
  });

  it('keeps every city content field translated', () => {
    for (const structure of CITY_STRUCTURES) assertLocalizedText(structure.name, structure.id);
    for (const npc of CITY_NPCS) {
      assertLocalizedText(npc.name, `${npc.id}.name`);
      assertLocalizedText(npc.greeting, `${npc.id}.greeting`);
    }
    for (const landmark of CITY_LANDMARKS) {
      assertLocalizedText(landmark.name, `${landmark.id}.name`);
      assertLocalizedText(landmark.description, `${landmark.id}.description`);
    }
    for (const quest of CITY_QUESTS) {
      assertLocalizedText(quest.title, `${quest.id}.title`);
      assertLocalizedText(quest.objective, `${quest.id}.objective`);
    }
  });

  it('has one clear quest giver for the first city quest', () => {
    const questGivers = CITY_NPCS.filter((npc) => npc.questId === CITY_QUESTS[0]?.id);
    expect(questGivers.map((npc) => npc.id)).toEqual(['mali']);
    expect(CITY_NPCS.filter((npc) => !npc.questId).length).toBeGreaterThan(0);
    expect(CITY_NPCS).toHaveLength(10);
    expect(CITY_LANDMARKS).toHaveLength(4);
  });

  it('orders the follow-up quest after the fountain quest', () => {
    expect(CITY_QUESTS[1]?.requiresQuestId).toBe(CITY_QUESTS[0]?.id);
    expect(CITY_NPCS.find((npc) => npc.id === 'dao')?.questId).toBe('light-the-park');
  });
});
