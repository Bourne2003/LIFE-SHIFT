import { describe, expect, it } from 'vitest';
import {
  advanceDialogue,
  beginDialogue,
  completeStep,
  conditionHolds,
  questStatus,
  selectNpcDialogue,
  startQuest,
  validateContent,
  type DialogueDef,
  type GameContent,
  type NpcDef,
  type QuestCatalog,
  type QuestDef,
  type QuestLog,
} from '../src';

/** Same text in every locale, for tests that do not care about language. */
const t = (s: string) => ({ th: s, en: s });

const quest: QuestDef = {
  id: 'q',
  title: t('Q'),
  steps: [
    { id: 'one', description: t('first') },
    { id: 'two', description: t('second') },
  ],
};
const quests: QuestCatalog = { q: quest };
const empty: QuestLog = {};

describe('quests', () => {
  it('starts at the first step and only once', () => {
    const log = startQuest(empty, quest);
    expect(log).toEqual({ q: { status: 'active', step: 'one' } });
    expect(startQuest(completeStep(log, quest, 'one'), quest).q).toEqual({
      status: 'active',
      step: 'two',
    });
  });

  it('advances step by step, then completes', () => {
    let log = startQuest(empty, quest);
    log = completeStep(log, quest, 'one');
    expect(log.q).toEqual({ status: 'active', step: 'two' });
    log = completeStep(log, quest, 'two');
    expect(questStatus(log, 'q')).toBe('completed');
  });

  it('ignores completing a step that is not current', () => {
    const log = startQuest(empty, quest);
    expect(completeStep(log, quest, 'two')).toBe(log);
    expect(completeStep(empty, quest, 'one')).toBe(empty);
  });

  it('evaluates conditions', () => {
    const log = startQuest(empty, quest);
    expect(conditionHolds(empty, { quest: 'q', status: 'notStarted' })).toBe(true);
    expect(conditionHolds(log, { quest: 'q', status: 'active' })).toBe(true);
    expect(conditionHolds(log, { quest: 'q', status: 'active', step: 'one' })).toBe(true);
    expect(conditionHolds(log, { quest: 'q', status: 'active', step: 'two' })).toBe(false);
  });
});

const dialogue: DialogueDef = {
  id: 'd',
  start: 'a',
  nodes: {
    a: { text: t('hi'), next: 'b' },
    b: {
      text: t('help?'),
      choices: [
        { text: t('yes'), next: 'c', effects: [{ type: 'startQuest', quest: 'q' }] },
        { text: t('no') },
      ],
    },
    c: { text: t('done'), effects: [{ type: 'completeStep', quest: 'q', step: 'one' }] },
  },
};

describe('dialogue', () => {
  it('walks nodes and applies choice and node effects', () => {
    let step = beginDialogue(dialogue, empty, quests);
    expect(step.node).toBe('a');
    step = advanceDialogue(dialogue, 'a', step.log, quests);
    expect(step.node).toBe('b');
    step = advanceDialogue(dialogue, 'b', step.log, quests, 0);
    expect(step.node).toBe('c');
    expect(step.log.q).toEqual({ status: 'active', step: 'two' });
    step = advanceDialogue(dialogue, 'c', step.log, quests);
    expect(step.node).toBeNull();
  });

  it('ends on a choice without next and leaves state untouched', () => {
    const step = advanceDialogue(dialogue, 'b', empty, quests, 1);
    expect(step).toEqual({ node: null, log: empty });
  });

  it('rejects a missing choice', () => {
    expect(() => advanceDialogue(dialogue, 'b', empty, quests)).toThrow();
    expect(() => advanceDialogue(dialogue, 'b', empty, quests, 5)).toThrow();
  });
});

describe('selectNpcDialogue', () => {
  const npc: NpcDef = {
    id: 'n',
    name: t('N'),
    xTiles: 0,
    yTiles: 0,
    dialogue: [
      { when: [{ quest: 'q', status: 'active', step: 'two' }], dialogue: 'later' },
      { dialogue: 'default' },
    ],
  };

  it('picks the first option whose conditions hold', () => {
    expect(selectNpcDialogue(npc, empty)).toBe('default');
    const log = completeStep(startQuest(empty, quest), quest, 'one');
    expect(selectNpcDialogue(npc, log)).toBe('later');
  });
});

describe('validateContent', () => {
  const valid: GameContent = {
    quests,
    dialogues: { d: dialogue },
    npcs: [{ id: 'n', name: t('N'), xTiles: 0, yTiles: 0, dialogue: [{ dialogue: 'd' }] }],
  };

  it('accepts consistent content', () => {
    expect(validateContent(valid)).toEqual([]);
  });

  it('reports broken references', () => {
    const broken: GameContent = {
      quests,
      dialogues: {
        d: {
          id: 'd',
          start: 'missing',
          nodes: {
            a: {
              text: t('x'),
              next: 'nowhere',
              effects: [{ type: 'completeStep', quest: 'q', step: 'nope' }],
            },
          },
        },
      },
      npcs: [
        { id: 'n', name: t('N'), xTiles: 0, yTiles: 0, dialogue: [{ dialogue: 'ghost' }] },
        {
          id: 'n',
          name: t('N2'),
          xTiles: 0,
          yTiles: 0,
          dialogue: [{ when: [{ quest: 'zzz', status: 'active' }], dialogue: 'd' }],
        },
      ],
    };
    const problems = validateContent(broken);
    expect(problems).toEqual(
      expect.arrayContaining([
        'dialogue "d": unknown start "missing"',
        'dialogue "d" node "a": unknown next node "nowhere"',
        'dialogue "d" node "a": quest "q" has no step "nope"',
        'npc "n": unknown dialogue "ghost"',
        'npc "n": duplicate id',
        'npc "n": unknown quest "zzz"',
        'npc "n": last dialogue option must be unconditional',
      ]),
    );
  });
});

describe('validateContent translations', () => {
  it('reports text missing in a locale', () => {
    const content: GameContent = {
      quests: { q: { ...quest, title: { th: 'เควสต์', en: '' } } },
      dialogues: { d: { id: 'd', start: 'a', nodes: { a: { text: { th: 'สวัสดี' } as never } } } },
      npcs: [
        {
          id: 'n',
          name: { th: 'น', en: 'N' },
          xTiles: 0,
          yTiles: 0,
          dialogue: [{ dialogue: 'd' }],
        },
      ],
    };
    expect(validateContent(content)).toEqual([
      'quest "q" title: missing translation (en)',
      'dialogue "d" node "a": missing translation (en)',
    ]);
  });
});
