import { describe, expect, it } from 'vitest';
import type { GameContent } from '@life-shift/shared';
import { loadContent, rawContent, validateContent } from '../src';

describe('shipped content', () => {
  it('passes validation', () => {
    expect(validateContent(rawContent())).toEqual([]);
  });

  it('meets the vertical-slice scope', () => {
    const content = loadContent();
    expect(content.npcs.length).toBeGreaterThanOrEqual(10);
    const ids = content.map.locations.map((l) => l.id);
    for (const required of [
      'central_street',
      'residential',
      'market',
      'restaurant',
      'park',
      'shop',
      'player_home',
      'hidden_garden',
      'clock_tower',
    ]) {
      expect(ids).toContain(required);
    }
    expect(Object.keys(content.quests).length).toBeGreaterThanOrEqual(1);
  });
});

describe('validateContent catches broken data', () => {
  const base = rawContent();
  const withChange = (change: (c: GameContent) => GameContent) => validateContent(change(base));

  it('flags NPCs placed on blocked tiles', () => {
    const errors = withChange((c) => ({
      ...c,
      npcs: c.npcs.map((n, i) => (i === 0 ? { ...n, position: { x: 0, y: 0 } } : n)),
    }));
    expect(errors.join()).toMatch(/npc noi position: tile 0,0 is blocked/);
  });

  it('flags references to unknown dialogues, quests and locations', () => {
    const errors = withChange((c) => ({
      ...c,
      npcs: c.npcs.map((n, i) => (i === 0 ? { ...n, dialogues: [{ dialogue: 'nope' }] } : n)),
      quests: {
        ...c.quests,
        q_know_town: {
          ...c.quests.q_know_town!,
          objectives: [{ id: 'x', description: 'x', type: 'reach', location: 'atlantis' }],
          next: 'q_missing',
        },
      },
    }));
    expect(errors.join('\n')).toMatch(/unknown dialogue 'nope'/);
    expect(errors.join('\n')).toMatch(/unknown location 'atlantis'/);
    expect(errors.join('\n')).toMatch(/unknown follow-up quest 'q_missing'/);
  });

  it('flags missing and unreachable dialogue nodes', () => {
    const errors = withChange((c) => ({
      ...c,
      dialogues: {
        ...c.dialogues,
        lek_default: {
          id: 'lek_default',
          start: 'a',
          nodes: { a: { text: 'hi', next: 'gone' }, orphan: { text: 'never shown' } },
        },
      },
    }));
    expect(errors).toContain("dialogue lek_default/a: next 'gone' missing");
    expect(errors).toContain('dialogue lek_default/orphan: unreachable');
  });

  it('flags conditions naming objectives a quest does not have', () => {
    const errors = withChange((c) => ({
      ...c,
      npcs: c.npcs.map((n, i) =>
        i === 1
          ? {
              ...n,
              dialogues: [
                {
                  dialogue: 'ken_default',
                  when: [
                    { type: 'quest', quest: 'q_know_town', status: 'active', objective: 'fly' },
                  ],
                },
              ],
            }
          : n,
      ),
    }));
    expect(errors.join('\n')).toMatch(/has no objective 'fly'/);
  });
});
