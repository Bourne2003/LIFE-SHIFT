import type { DialogueDef } from '@life-shift/shared';

/** A one-line conversation. */
function line(id: string, text: string): DialogueDef {
  return { id, start: 'a', nodes: { a: { text } } };
}

const list: readonly DialogueDef[] = [
  line('alex-greeting', 'Morning! The city feels different every day, doesn’t it?'),
  line('nida-greeting', 'I’m waiting for the shop to open. Rumour says they got new stock.'),
  line('pim-greeting', 'Have you seen the park at night? The lanterns are beautiful.'),
  line('somchai-greeting', 'Hello there. Mina makes the best noodles on this street.'),

  {
    id: 'mina-offer',
    start: 'hello',
    nodes: {
      hello: { text: 'Hi! I’m Mina. I run the noodle stall on the main street.', next: 'ask' },
      ask: {
        text: 'Could you take my new recipe to Somchai? He’s south-east of here, past the crossroads.',
        choices: [
          {
            text: 'Sure, I’ll take it.',
            next: 'accepted',
            effects: [{ type: 'startQuest', quest: 'minas-recipe' }],
          },
          { text: 'Not right now.', next: 'declined' },
        ],
      },
      accepted: { text: 'Thank you! Tell him to use less sugar this time.' },
      declined: { text: 'No problem. Come back if you change your mind.' },
    },
  },
  line('mina-waiting', 'Somchai is south-east of here, past the crossroads. Thanks again!'),
  {
    id: 'mina-thanks',
    start: 'thanks',
    nodes: {
      thanks: {
        text: 'He got it? Wonderful! You’re a real help around here.',
        effects: [{ type: 'completeStep', quest: 'minas-recipe', step: 'return' }],
      },
    },
  },
  line('mina-after', 'Thanks to you, Somchai finally cooks it right. Come by for noodles!'),

  {
    id: 'somchai-receive',
    start: 'receive',
    nodes: {
      receive: {
        text: 'A recipe from Mina? Finally! Less sugar, she says… Please tell her thank you.',
        effects: [{ type: 'completeStep', quest: 'minas-recipe', step: 'deliver' }],
      },
    },
  },
];

export const DIALOGUES: Readonly<Record<string, DialogueDef>> = Object.fromEntries(
  list.map((d) => [d.id, d]),
);
