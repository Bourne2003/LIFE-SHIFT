import { describe, expect, it } from 'vitest';
import {
  advanceDialogue,
  applyEffects,
  availableChoices,
  beginDialogue,
  chooseDialogueOption,
  createInitialState,
  getNode,
  selectDialogue,
  startQuest,
  type DialogueCursor,
} from '../src';
import { content } from './fixtures';

const giver = content.npcs[0]!;
const fresh = createInitialState();
const at = (node: string): DialogueCursor => ({ dialogue: 'giver_offer', node });

describe('selectDialogue', () => {
  it('uses the first dialogue whose conditions hold', () => {
    expect(selectDialogue(giver, fresh, content)?.id).toBe('giver_offer');
    let state = startQuest(fresh, content, 'q1').state;
    state = { ...state, quests: { q1: { status: 'completed', objectiveIndex: 2 } } };
    expect(selectDialogue(giver, state, content)?.id).toBe('giver_done');
  });

  it('returns undefined for NPCs with nothing to say', () => {
    expect(selectDialogue(content.npcs[1]!, fresh, content)).toBeUndefined();
  });
});

describe('dialogue flow', () => {
  it('begins at the start node and reports its effects', () => {
    const step = beginDialogue(content.dialogues.giver_offer!, content);
    expect(step.cursor).toEqual(at('hello'));
    expect(step.effects).toEqual([{ type: 'setFlag', flag: 'met_giver' }]);
  });

  it('advances linear nodes and ends after the last one', () => {
    expect(advanceDialogue(at('hello'), fresh, content)?.cursor).toEqual(at('ask'));
    expect(advanceDialogue(at('thanks'), fresh, content)).toEqual({ cursor: null, effects: [] });
  });

  it('refuses to advance past a node that is waiting for a choice', () => {
    expect(advanceDialogue(at('ask'), fresh, content)).toBeNull();
  });

  it('hides choices whose conditions fail but keeps original indices', () => {
    const node = getNode(content, at('ask'));
    expect(availableChoices(node, fresh, content).map((c) => c.index)).toEqual([0, 2]);
    const vip = applyEffects(fresh, content, [{ type: 'setFlag', flag: 'vip' }]).state;
    expect(availableChoices(node, vip, content).map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it('applies choice effects and moves to the chosen node', () => {
    const step = chooseDialogueOption(at('ask'), 0, fresh, content);
    expect(step?.cursor).toEqual(at('thanks'));
    expect(step?.effects).toEqual([{ type: 'startQuest', quest: 'q1' }]);
  });

  it('ends on a choice without next', () => {
    expect(chooseDialogueOption(at('ask'), 2, fresh, content)).toEqual({
      cursor: null,
      effects: [],
    });
  });

  it('rejects hidden or out-of-range choices', () => {
    expect(chooseDialogueOption(at('ask'), 1, fresh, content)).toBeNull();
    expect(chooseDialogueOption(at('ask'), 9, fresh, content)).toBeNull();
  });
});
