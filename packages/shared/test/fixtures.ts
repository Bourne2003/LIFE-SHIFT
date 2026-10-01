import type { GameContent, NpcDef } from '../src';

const npc = (id: string, overrides: Partial<NpcDef> = {}): NpcDef => ({
  id,
  name: id.toUpperCase(),
  occupation: 'tester',
  personality: [],
  color: '#888888',
  position: { x: 1, y: 1 },
  schedule: [],
  dialogues: [],
  relationships: {},
  quests: [],
  ...overrides,
});

/** Tiny hand-made world used by unit tests (independent of the real game data). */
export const content: GameContent = {
  map: {
    id: 'test',
    name: 'Test',
    legend: { '.': 'grass', '#': 'building', '~': 'water' },
    rows: ['....', '.#..', '..~.'],
    spawn: { x: 0, y: 0 },
    locations: [
      { id: 'town', name: 'Town', area: { x: 0, y: 0, width: 4, height: 3 } },
      { id: 'pond', name: 'Pond', area: { x: 2, y: 2, width: 1, height: 1 } },
    ],
  },
  npcs: [
    npc('giver', {
      dialogues: [
        { dialogue: 'giver_done', when: [{ type: 'quest', quest: 'q1', status: 'completed' }] },
        { dialogue: 'giver_offer' },
      ],
    }),
    npc('friend', {
      position: { x: 0, y: 0 },
      schedule: [
        { period: 'night', position: { x: 3, y: 0 } },
        { period: 'any', position: { x: 2, y: 0 }, when: [{ type: 'flag', flag: 'moved' }] },
      ],
    }),
  ],
  objects: [
    {
      id: 'sign',
      name: 'Sign',
      position: { x: 3, y: 1 },
      appearances: [
        { texture: 'sign_open', when: [{ type: 'flag', flag: 'open' }] },
        { texture: 'sign_closed' },
      ],
      dialogues: [],
    },
  ],
  dialogues: {
    giver_offer: {
      id: 'giver_offer',
      start: 'hello',
      nodes: {
        hello: { text: 'Hello!', next: 'ask', effects: [{ type: 'setFlag', flag: 'met_giver' }] },
        ask: {
          text: 'Help me?',
          choices: [
            { text: 'Yes', next: 'thanks', effects: [{ type: 'startQuest', quest: 'q1' }] },
            { text: 'Secret', when: [{ type: 'flag', flag: 'vip' }] },
            { text: 'No' },
          ],
        },
        thanks: { speaker: 'player', text: 'On it.' },
      },
    },
    giver_done: { id: 'giver_done', start: 'a', nodes: { a: { text: 'Thanks again.' } } },
  },
  quests: {
    q1: {
      id: 'q1',
      title: 'First',
      giver: 'giver',
      description: 'Talk then walk.',
      objectives: [
        { id: 'talk_friend', description: 'Talk to friend', type: 'talk', npc: 'friend' },
        { id: 'reach_pond', description: 'Visit the pond', type: 'reach', location: 'pond' },
      ],
      rewards: [{ type: 'setFlag', flag: 'q1_reward', value: 5 }],
      next: 'q2',
    },
    q2: {
      id: 'q2',
      title: 'Second',
      description: 'Follow-up.',
      objectives: [{ id: 'back', description: 'Back to giver', type: 'talk', npc: 'giver' }],
      rewards: [],
    },
  },
};
