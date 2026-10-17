import type { DialogueDef, LocalizedText } from '@life-shift/shared';

/** A one-line conversation. */
function line(id: string, text: LocalizedText): DialogueDef {
  return { id, start: 'a', nodes: { a: { text } } };
}

const list: readonly DialogueDef[] = [
  line('alex-greeting', {
    th: 'อรุณสวัสดิ์! เมืองนี้ดูเปลี่ยนไปทุกวันเลยนะ ว่าไหม?',
    en: 'Morning! The city feels different every day, doesn’t it?',
  }),
  line('alex-again', {
    th: 'อ้าว เจอกันอีกแล้ว! วันนี้ไปไหนมาล่ะ?',
    en: 'Oh, you again! Where are you off to today?',
  }),
  line('alex-stall', {
    th: 'ได้ยินว่าสมชายเปิดร้านก๋วยเตี๋ยวแล้ว! เห็นว่าเธอช่วยไว้ด้วยนี่',
    en: 'I heard Somchai opened a noodle stall! Word is you helped him.',
  }),
  line('nida-stall', {
    th: 'ร้านก๋วยเตี๋ยวใหม่ของสมชายคนต่อคิวเพียบเลย ฉันจะไปลองบ้าง',
    en: 'Somchai’s new noodle stall already has a queue. I’m going to try it.',
  }),
  line('somchai-stall', {
    th: 'ร้านเปิดแล้วครับ! ทั้งหมดนี้เพราะสูตรของมีนากับความช่วยเหลือของคุณ',
    en: 'The stall is open! All thanks to Mina’s recipe and your help.',
  }),
  line('nida-greeting', {
    th: 'ฉันรอร้านเปิดอยู่น่ะ ได้ยินมาว่ามีของใหม่เข้ามาด้วย',
    en: 'I’m waiting for the shop to open. Rumour says they got new stock.',
  }),
  {
    id: 'pim-ask',
    start: 'ask',
    nodes: {
      ask: {
        text: {
          th: 'พรุ่งนี้ฉันจะไปไหว้พระ แต่ยังไม่มีพวงมาลัยเลย… ช่วยซื้อจากร้านป้าแดงมาให้หน่อยได้ไหม? เดี๋ยวให้ค่าเหนื่อยนะ',
          en: 'I’m visiting the shrine tomorrow but I have no garland… Could you buy one at Aunt Daeng’s for me? I’ll pay you for the trouble.',
        },
        choices: [
          {
            text: { th: 'ได้สิ เดี๋ยวไปซื้อให้', en: 'Sure, I’ll get one.' },
            next: 'accepted',
            effects: [{ type: 'startQuest', quest: 'pims-garland' }],
          },
          { text: { th: 'ไว้ก่อนนะ', en: 'Maybe later.' } },
        ],
      },
      accepted: {
        text: {
          th: 'ขอบคุณนะ! ร้านป้าแดงอยู่ทางตะวันออก ใต้ตึกใหญ่ทางขวาบน',
          en: 'Thank you! Aunt Daeng’s store is to the east, below the big building up north.',
        },
      },
    },
  },
  line('pim-waiting', {
    th: 'ร้านป้าแดงอยู่ทางตะวันออก ใต้ตึกใหญ่ทางขวาบนนะ พวงมาลัยราคาไม่แพงหรอก',
    en: 'Aunt Daeng’s is to the east, below the big building up north. Garlands aren’t expensive.',
  }),
  {
    id: 'pim-receive',
    start: 'receive',
    nodes: {
      receive: {
        text: {
          th: 'พวงมาลัยมะลิ! หอมจังเลย ขอบคุณมากนะ นี่ค่าเหนื่อยจ้ะ',
          en: 'A jasmine garland! It smells wonderful. Thank you — here’s something for your trouble.',
        },
        effects: [
          { type: 'changeItem', item: 'jasmine-garland', count: -1 },
          { type: 'completeStep', quest: 'pims-garland', step: 'bring' },
        ],
      },
    },
  },
  line('pim-after', {
    th: 'เคยเห็นสวนสาธารณะตอนกลางคืนไหม? โคมไฟสวยมากเลยนะ',
    en: 'Have you seen the park at night? The lanterns are beautiful.',
  }),
  line('pim-night', {
    th: 'เห็นไหม โคมไฟในสวนเปิดแล้ว สวยอย่างที่บอกใช่ไหมล่ะ',
    en: 'See? The park lanterns are lit. Beautiful, just like I said.',
  }),
  line('nida-rain', {
    th: 'ฝนตกอีกแล้ว… ร้านคงเปิดช้า ไปหลบฝนใต้ชายคากันเถอะ',
    en: 'Rain again… the shop will open late. Let’s wait under the eaves.',
  }),
  {
    id: 'daeng-hello',
    start: 'hello',
    nodes: {
      hello: {
        text: {
          th: 'มาแล้วเหรอจ๊ะ วันนี้อยากได้อะไรล่ะ?',
          en: 'Welcome, dear! What can I get you today?',
        },
        choices: [
          { text: { th: 'ขอดูของหน่อย', en: 'Let me see your goods.' }, opensShop: 'daeng-store' },
          { text: { th: 'แค่แวะมาทักทาย', en: 'Just saying hello.' }, next: 'bye' },
        ],
      },
      bye: {
        text: { th: 'แวะมาบ่อย ๆ นะจ๊ะ', en: 'Come by any time, dear.' },
      },
    },
  },
  line('somchai-greeting', {
    th: 'สวัสดีครับ มีนาทำก๋วยเตี๋ยวอร่อยที่สุดในถนนสายนี้เลยนะ',
    en: 'Hello there. Mina makes the best noodles on this street.',
  }),

  {
    id: 'mina-offer',
    start: 'hello',
    nodes: {
      hello: {
        text: {
          th: 'สวัสดีจ้ะ! ฉันชื่อมีนา เปิดร้านก๋วยเตี๋ยวอยู่ริมถนนใหญ่',
          en: 'Hi! I’m Mina. I run the noodle stall on the main street.',
        },
        next: 'ask',
      },
      ask: {
        text: {
          th: 'ช่วยเอาสูตรใหม่ของฉันไปให้สมชายหน่อยได้ไหม? เขาอยู่ทางตะวันออกเฉียงใต้ เลยสี่แยกไปนิดเดียว',
          en: 'Could you take my new recipe to Somchai? He’s south-east of here, past the crossroads.',
        },
        choices: [
          {
            text: { th: 'ได้เลย เดี๋ยวเอาไปให้', en: 'Sure, I’ll take it.' },
            next: 'accepted',
            effects: [{ type: 'startQuest', quest: 'minas-recipe' }],
          },
          { text: { th: 'ตอนนี้ยังไม่ว่าง', en: 'Not right now.' }, next: 'declined' },
        ],
      },
      accepted: {
        text: {
          th: 'ขอบใจมากนะ! บอกเขาด้วยว่าคราวนี้ใส่น้ำตาลน้อยลงหน่อย',
          en: 'Thank you! Tell him to use less sugar this time.',
        },
      },
      declined: {
        text: {
          th: 'ไม่เป็นไรจ้ะ ถ้าเปลี่ยนใจก็กลับมาหาฉันนะ',
          en: 'No problem. Come back if you change your mind.',
        },
      },
    },
  },
  line('mina-waiting', {
    th: 'สมชายอยู่ทางตะวันออกเฉียงใต้ เลยสี่แยกไปนิดเดียว ขอบใจอีกครั้งนะ!',
    en: 'Somchai is south-east of here, past the crossroads. Thanks again!',
  }),
  {
    id: 'mina-thanks',
    start: 'thanks',
    nodes: {
      thanks: {
        text: {
          th: 'เขาได้รับแล้วเหรอ? ดีจังเลย! เธอช่วยคนแถวนี้ได้เยอะจริง ๆ',
          en: 'He got it? Wonderful! You’re a real help around here.',
        },
        effects: [{ type: 'completeStep', quest: 'minas-recipe', step: 'return' }],
      },
    },
  },
  line('mina-after', {
    th: 'เพราะเธอแท้ ๆ ตอนนี้สมชายทำได้อร่อยแล้ว แวะมากินก๋วยเตี๋ยวนะ!',
    en: 'Thanks to you, Somchai finally cooks it right. Come by for noodles!',
  }),

  {
    id: 'somchai-receive',
    start: 'receive',
    nodes: {
      receive: {
        text: {
          th: 'สูตรจากมีนาเหรอ? ในที่สุด! น้ำตาลน้อยลงสินะ… ฝากขอบคุณเธอด้วยนะครับ',
          en: 'A recipe from Mina? Finally! Less sugar, she says… Please tell her thank you.',
        },
        effects: [{ type: 'completeStep', quest: 'minas-recipe', step: 'deliver' }],
      },
    },
  },
];

export const DIALOGUES: Readonly<Record<string, DialogueDef>> = Object.fromEntries(
  list.map((d) => [d.id, d]),
);
