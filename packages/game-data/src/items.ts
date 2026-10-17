import type { ItemCatalog, ShopCatalog } from '@life-shift/shared';

export const ITEMS: ItemCatalog = {
  'jasmine-garland': {
    id: 'jasmine-garland',
    name: { th: 'พวงมาลัยมะลิ', en: 'Jasmine garland' },
    description: {
      th: 'พวงมาลัยดอกมะลิสด หอมชื่นใจ ใช้ไหว้พระหรือมอบให้คนสำคัญ',
      en: 'Fresh jasmine flowers, for offerings at the shrine or for someone special.',
    },
  },
  'thai-iced-tea': {
    id: 'thai-iced-tea',
    name: { th: 'ชาเย็น', en: 'Thai iced tea' },
    description: {
      th: 'ชาสีส้มหวานมันใส่นมข้น ดื่มแล้วสดชื่น',
      en: 'Sweet orange tea with condensed milk. Very refreshing.',
    },
  },
  'mango-sticky-rice': {
    id: 'mango-sticky-rice',
    name: { th: 'ข้าวเหนียวมะม่วง', en: 'Mango sticky rice' },
    description: {
      th: 'มะม่วงน้ำดอกไม้สุกกับข้าวเหนียวมูนราดกะทิ',
      en: 'Ripe mango with sweet coconut sticky rice.',
    },
  },
  'machine-oil': {
    id: 'machine-oil',
    name: { th: 'น้ำมันหล่อลื่น', en: 'Machine oil' },
    description: {
      th: 'น้ำมันขวดเล็กสำหรับหยอดเฟืองและบานพับที่ฝืด',
      en: 'A small bottle of oil for stiff gears and hinges.',
    },
  },
  'green-curry': {
    id: 'green-curry',
    name: { th: 'แกงเขียวหวาน', en: 'Green curry' },
    description: {
      th: 'แกงเขียวหวานไก่ร้อน ๆ ใส่ปิ่นโตจากร้านยายบุญ',
      en: 'Hot chicken green curry in a tiffin carrier from Grandma Boon’s.',
    },
  },
};

export const SHOPS: ShopCatalog = {
  'daeng-store': {
    id: 'daeng-store',
    name: { th: 'ร้านชำป้าแดง', en: 'Aunt Daeng’s Store' },
    stock: [
      { item: 'jasmine-garland', price: 20 },
      { item: 'thai-iced-tea', price: 15 },
      { item: 'mango-sticky-rice', price: 35 },
      { item: 'machine-oil', price: 25 },
    ],
  },
};
