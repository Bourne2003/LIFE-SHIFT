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
  line('alex-clock', {
    th: 'ได้ยินไหม? หอนาฬิกาตีบอกเวลาอีกแล้ว เงียบไปตั้งหลายปี',
    en: 'Hear that? The clock tower is chiming again. It was silent for years.',
  }),

  // Grandma Boon: a delivery that only works after dark.
  {
    id: 'boon-ask',
    start: 'hello',
    nodes: {
      hello: {
        text: {
          th: 'มาแล้วเหรอหลาน ลุงชัยที่หอนาฬิกาทำงานกะดึกทุกวันจนไม่ได้กินข้าว ยายห่อแกงไว้ให้แล้ว ช่วยเอาไปให้ตอนเย็น ๆ หน่อยได้ไหม?',
          en: 'Ah, there you are, dear. Uncle Chai at the clock tower works nights and forgets to eat. I packed him some curry — could you take it to him this evening?',
        },
        choices: [
          {
            text: { th: 'ได้ครับ/ค่ะ ยาย', en: 'Of course, Grandma.' },
            next: 'given',
            effects: [
              { type: 'startQuest', quest: 'boons-curry' },
              { type: 'changeItem', item: 'green-curry', count: 1 },
            ],
          },
          { text: { th: 'ขอโทษนะยาย ตอนนี้ยังไม่ว่าง', en: 'Sorry, not right now.' } },
        ],
      },
      given: {
        text: {
          th: 'นี่ปิ่นโตแกงเขียวหวาน ยังร้อน ๆ อยู่เลย เขาจะมาประจำหอนาฬิกาตอนเย็นนะ',
          en: 'Here’s the green curry, still hot. He starts at the clock tower in the evening.',
        },
      },
    },
  },
  line('boon-waiting', {
    th: 'ลุงชัยจะอยู่ที่หอนาฬิกาตอนเย็นจนดึกนะหลาน อย่าลืมเอาแกงไปให้ล่ะ',
    en: 'Uncle Chai is at the clock tower from evening until late. Don’t forget the curry, dear.',
  }),
  line('boon-after', {
    th: 'ลุงชัยฝากขอบใจมาด้วย ว่าง ๆ มากินข้าวที่ร้านยายนะ',
    en: 'Uncle Chai sent his thanks. Come and eat at my shop some time.',
  }),

  // Uncle Chai: the clock tower keeper.
  {
    id: 'chai-ask',
    start: 'ask',
    nodes: {
      ask: {
        text: {
          th: 'หอนาฬิกาหยุดเดินมาหลายปีแล้ว เฟืองมันฝืดหมด ถ้ามีน้ำมันหล่อลื่นสักขวดก็น่าจะซ่อมได้นะ… ช่วยลุงหน่อยได้ไหม?',
          en: 'The tower clock stopped years ago. The gears are stiff — with a bottle of machine oil I could fix it… Would you help me?',
        },
        choices: [
          {
            text: { th: 'ได้เลยครับ/ค่ะ ลุง', en: 'Sure, I’ll find some.' },
            next: 'accepted',
            effects: [{ type: 'startQuest', quest: 'stopped-clock' }],
          },
          { text: { th: 'ไว้ก่อนนะลุง', en: 'Maybe later.' } },
        ],
      },
      accepted: {
        text: {
          th: 'ร้านป้าแดงน่าจะมีขายนะ ขอบใจมาก',
          en: 'Aunt Daeng’s store should have some. Thank you.',
        },
      },
    },
  },
  line('chai-waiting', {
    th: 'น้ำมันหล่อลื่นหาได้ที่ร้านป้าแดงนะ ลุงรออยู่ตรงนี้แหละ',
    en: 'You can get machine oil at Aunt Daeng’s. I’ll be right here.',
  }),
  {
    id: 'chai-oil',
    start: 'oil',
    nodes: {
      oil: {
        text: {
          th: 'น้ำมันหล่อลื่น! เดี๋ยวลุงหยอดเฟืองให้… ฟังสิ หอนาฬิกาเดินแล้ว! นี่ค่าเหนื่อยนะ',
          en: 'Machine oil! Let me oil the gears… Listen — the clock is running again! Here, for your trouble.',
        },
        effects: [
          { type: 'changeItem', item: 'machine-oil', count: -1 },
          { type: 'completeStep', quest: 'stopped-clock', step: 'oil' },
        ],
      },
    },
  },
  line('chai-after', {
    th: 'ทุกชั่วโมงหอนาฬิกาจะตีบอกเวลา คนทั้งเมืองได้ยินเลยนะ',
    en: 'Every hour the tower chimes now. The whole town can hear it.',
  }),
  line('chai-curry-early', {
    th: 'แกงจากยายบุญเหรอ ขอบใจนะ แต่ลุงยังไม่เข้ากะ เอามาตอนเย็นดีกว่า จะได้กินตอนยังร้อน',
    en: 'Curry from Grandma Boon? Thanks — but my shift hasn’t started. Bring it this evening so I can eat it hot.',
  }),
  {
    id: 'chai-curry',
    start: 'curry',
    nodes: {
      curry: {
        text: {
          th: 'แกงเขียวหวานของยายบุญ! หอมจริง ๆ คืนนี้ลุงไม่หิวแล้ว ฝากขอบใจยายด้วยนะ',
          en: 'Grandma Boon’s green curry! It smells wonderful. I won’t go hungry tonight — thank her for me.',
        },
        effects: [
          { type: 'changeItem', item: 'green-curry', count: -1 },
          { type: 'completeStep', quest: 'boons-curry', step: 'deliver' },
        ],
      },
    },
  },

  // Ton and his cat Som.
  {
    id: 'ton-ask',
    start: 'ask',
    nodes: {
      ask: {
        text: {
          th: 'เจ้าส้ม แมวของผมหายไปตั้งแต่เมื่อวาน… มันชอบมุดเข้าซอยแคบ ๆ หลังร้านยายบุญ แต่ผมเข้าไปไม่เป็น ช่วยตามหาหน่อยได้ไหมครับ?',
          en: 'Som, my cat, has been gone since yesterday… She loves the narrow alley behind Grandma Boon’s, but I can’t find the way in. Could you look for her?',
        },
        choices: [
          {
            text: { th: 'ได้สิ เดี๋ยวไปตามหาให้', en: 'Sure, I’ll look for her.' },
            next: 'accepted',
            effects: [{ type: 'startQuest', quest: 'lost-cat' }],
          },
          { text: { th: 'ไว้ทีหลังนะ', en: 'Later, okay?' } },
        ],
      },
      accepted: {
        text: {
          th: 'ขอบคุณครับ! ทางเข้าซอยน่าจะอยู่แถวด้านล่างของร้านยายบุญนะ',
          en: 'Thank you! The way into the alley should be somewhere below Grandma Boon’s shop.',
        },
      },
    },
  },
  line('ton-waiting', {
    th: 'ยังไม่เจอเจ้าส้มเลยเหรอครับ… ลองหาทางเข้าซอยที่อยู่ด้านล่างของร้านยายบุญดูนะ',
    en: 'Still no Som?… Try to find the way into the alley below Grandma Boon’s shop.',
  }),
  {
    id: 'ton-found',
    start: 'found',
    nodes: {
      found: {
        text: {
          th: 'เจ้าส้มกลับมาแล้ว! มันวิ่งมาหาผมเลย ขอบคุณมากนะครับ นี่เงินเก็บของผม',
          en: 'Som is back! She ran straight to me. Thank you so much — here, from my savings.',
        },
        effects: [{ type: 'completeStep', quest: 'lost-cat', step: 'tell' }],
      },
    },
  },
  line('ton-after', {
    th: 'ตอนนี้ผมผูกกระดิ่งให้เจ้าส้มแล้ว จะได้ไม่หลงอีก',
    en: 'I put a little bell on Som now, so she won’t get lost again.',
  }),
  {
    id: 'som-found',
    start: 'found',
    nodes: {
      found: {
        speaker: { th: 'เจ้าส้ม', en: 'Som' },
        text: {
          th: 'เมี้ยว~ (เจ้าส้มคลอเคลียขาคุณ แล้ววิ่งออกจากซอยไปทางตลาด)',
          en: 'Meow~ (Som rubs against your legs, then trots out of the alley toward the market.)',
        },
        effects: [
          { type: 'setFlag', flag: 'som-left-alley' },
          { type: 'completeStep', quest: 'lost-cat', step: 'find' },
        ],
      },
    },
  },
  line('som-meow', {
    th: 'เมี้ยว? (แมวส้มตัวอ้วนมองคุณอย่างสงสัย)',
    en: 'Meow? (A chubby orange cat eyes you curiously.)',
  }),
  line('som-purr', {
    th: 'ครืด ครืด… (เจ้าส้มนอนอาบแดดข้าง ๆ ต้นอย่างมีความสุข)',
    en: 'Purr… (Som is happily sunbathing next to Ton.)',
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
