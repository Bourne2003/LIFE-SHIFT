import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  advanceDialogue,
  applyEffects,
  beginDialogue,
  completeStep,
  conditionHolds,
  isPropVisible,
  questStatus,
  recordTalk,
  selectNpcDialogue,
  startQuest,
  validateContent,
  type DialogueDef,
  type GameContent,
  type GameState,
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
  onComplete: [{ type: 'setFlag', flag: 'q-done' }],
};
const quests: QuestCatalog = { q: quest };
const emptyLog: QuestLog = {};
const S0: GameState = INITIAL_STATE;
const withLog = (quests: QuestLog): GameState => ({ ...S0, quests });

describe('quests', () => {
  it('starts at the first step and only once', () => {
    const log = startQuest(emptyLog, quest);
    expect(log).toEqual({ q: { status: 'active', step: 'one' } });
    expect(startQuest(completeStep(log, quest, 'one'), quest).q).toEqual({
      status: 'active',
      step: 'two',
    });
  });

  it('advances step by step, then completes', () => {
    let log = startQuest(emptyLog, quest);
    log = completeStep(log, quest, 'one');
    expect(log.q).toEqual({ status: 'active', step: 'two' });
    log = completeStep(log, quest, 'two');
    expect(questStatus(log, 'q')).toBe('completed');
  });

  it('ignores completing a step that is not current', () => {
    const log = startQuest(emptyLog, quest);
    expect(completeStep(log, quest, 'two')).toBe(log);
    expect(completeStep(emptyLog, quest, 'one')).toBe(emptyLog);
  });
});

describe('conditions', () => {
  it('test quest progress', () => {
    const s = withLog(startQuest(emptyLog, quest));
    expect(conditionHolds(S0, { quest: 'q', status: 'notStarted' })).toBe(true);
    expect(conditionHolds(s, { quest: 'q', status: 'active' })).toBe(true);
    expect(conditionHolds(s, { quest: 'q', status: 'active', step: 'one' })).toBe(true);
    expect(conditionHolds(s, { quest: 'q', status: 'active', step: 'two' })).toBe(false);
  });

  it('test world flags', () => {
    const s = { ...S0, flags: { open: true } };
    expect(conditionHolds(s, { flag: 'open' })).toBe(true);
    expect(conditionHolds(s, { flag: 'open', is: false })).toBe(false);
    expect(conditionHolds(S0, { flag: 'open', is: false })).toBe(true);
  });

  it('test NPC memory', () => {
    expect(conditionHolds(S0, { npc: 'n', met: false })).toBe(true);
    const s = recordTalk(recordTalk(S0, 'n'), 'n');
    expect(s.npcs.n).toEqual({ talks: 2 });
    expect(conditionHolds(s, { npc: 'n', met: true })).toBe(true);
  });
});

describe('effects', () => {
  it('apply quest consequences once, when the quest completes', () => {
    let s = applyEffects(S0, [{ type: 'startQuest', quest: 'q' }], quests);
    s = applyEffects(s, [{ type: 'completeStep', quest: 'q', step: 'one' }], quests);
    expect(s.flags).toEqual({});
    s = applyEffects(s, [{ type: 'completeStep', quest: 'q', step: 'two' }], quests);
    expect(questStatus(s.quests, 'q')).toBe('completed');
    expect(s.flags).toEqual({ 'q-done': true });
  });

  it('set and clear flags, keeping identity when nothing changes', () => {
    const s = applyEffects(S0, [{ type: 'setFlag', flag: 'f' }], quests);
    expect(s.flags.f).toBe(true);
    expect(applyEffects(s, [{ type: 'setFlag', flag: 'f' }], quests)).toBe(s);
    expect(applyEffects(s, [{ type: 'setFlag', flag: 'f', value: false }], quests).flags.f).toBe(
      false,
    );
  });

  it('reject unknown quests', () => {
    expect(() => applyEffects(S0, [{ type: 'startQuest', quest: 'zzz' }], quests)).toThrow();
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
    let step = beginDialogue(dialogue, S0, quests);
    expect(step.node).toBe('a');
    step = advanceDialogue(dialogue, 'a', step.state, quests);
    expect(step.node).toBe('b');
    step = advanceDialogue(dialogue, 'b', step.state, quests, 0);
    expect(step.node).toBe('c');
    expect(step.state.quests.q).toEqual({ status: 'active', step: 'two' });
    step = advanceDialogue(dialogue, 'c', step.state, quests);
    expect(step.node).toBeNull();
  });

  it('ends on a choice without next and leaves state untouched', () => {
    const step = advanceDialogue(dialogue, 'b', S0, quests, 1);
    expect(step).toEqual({ node: null, state: S0 });
  });

  it('rejects a missing choice', () => {
    expect(() => advanceDialogue(dialogue, 'b', S0, quests)).toThrow();
    expect(() => advanceDialogue(dialogue, 'b', S0, quests, 5)).toThrow();
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
      { when: [{ npc: 'n', met: true }], dialogue: 'again' },
      { dialogue: 'default' },
    ],
  };

  it('picks the first option whose conditions hold', () => {
    expect(selectNpcDialogue(npc, S0)).toBe('default');
    expect(selectNpcDialogue(npc, recordTalk(S0, 'n'))).toBe('again');
    const s = withLog(completeStep(startQuest(emptyLog, quest), quest, 'one'));
    expect(selectNpcDialogue(npc, s)).toBe('later');
  });
});

describe('world props', () => {
  it('are visible only while their conditions hold', () => {
    const prop = {
      id: 'p',
      kind: 'noodle-stall' as const,
      xTiles: 0,
      yTiles: 0,
      widthTiles: 1,
      heightTiles: 1,
      when: [{ flag: 'q-done' }],
    };
    expect(isPropVisible(prop, S0)).toBe(false);
    expect(isPropVisible(prop, { ...S0, flags: { 'q-done': true } })).toBe(true);
    expect(isPropVisible({ ...prop, when: [] }, S0)).toBe(true);
  });
});

describe('validateContent', () => {
  const valid: GameContent = {
    quests,
    dialogues: { d: dialogue },
    npcs: [{ id: 'n', name: t('N'), xTiles: 0, yTiles: 0, dialogue: [{ dialogue: 'd' }] }],
    items: {},
    shops: {},
    props: [
      {
        id: 'p',
        kind: 'noodle-stall',
        xTiles: 0,
        yTiles: 0,
        widthTiles: 1,
        heightTiles: 1,
        when: [{ flag: 'q-done' }],
      },
    ],
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
      items: {},
      shops: {},
      props: [
        { id: 'p', kind: 'noodle-stall', xTiles: 0, yTiles: 0, widthTiles: 1, heightTiles: 1 },
        {
          id: 'p',
          kind: 'noodle-stall',
          xTiles: 0,
          yTiles: 0,
          widthTiles: 1,
          heightTiles: 1,
          when: [{ flag: 'never' }, { npc: 'ghost', met: true }],
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
        'prop "p": duplicate id',
        'prop "p": flag "never" is never set',
        'prop "p": unknown npc "ghost"',
      ]),
    );
  });

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
      props: [],
      items: {},
      shops: {},
    };
    expect(validateContent(content)).toEqual([
      'quest "q" title: missing translation (en)',
      'dialogue "d" node "a": missing translation (en)',
    ]);
  });
});
