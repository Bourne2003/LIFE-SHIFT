import { expect, test, type Page } from '@playwright/test';
import { dialogueState, openGame, playerPos, questLog, teleport } from './helpers';

const NEAR_PIM = { x: 336, y: 900 }; // just south of Pim (feet at 336, 864)
const NEAR_DAENG = { x: 1040, y: 352 }; // just south of Aunt Daeng (feet at 1040, 320)

const shop = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.shop());
const state = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.state());
const controls = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.controls());

async function goTo(page: Page, spot: { x: number; y: number }, npc: string) {
  await teleport(page, spot);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc())).toBe(npc);
}

async function pressUntilClosed(page: Page) {
  while (await dialogueState(page)) {
    await page.keyboard.press('e');
    await page.waitForTimeout(50);
  }
}

test("desktop: buy a garland at Aunt Daeng's and deliver it to Pim", async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard is a desktop input');
  await openGame(page);
  expect((await state(page)).money).toBe(50);

  await goTo(page, NEAR_PIM, 'pim');
  await page.keyboard.press('e');
  await expect.poll(async () => (await dialogueState(page))?.choices.length).toBe(2);
  await pressUntilClosed(page); // accepts (first choice)
  expect(await questLog(page)).toEqual({ 'pims-garland': { status: 'active', step: 'bring' } });

  await goTo(page, NEAR_DAENG, 'daeng');
  await page.keyboard.press('e');
  await expect.poll(async () => (await dialogueState(page))?.speaker.th).toBe('ป้าแดง');
  await page.keyboard.press('e'); // "let me see your goods"
  await expect.poll(async () => (await shop(page))?.shopId).toBe('daeng-store');

  // The player cannot walk away while shopping.
  const before = (await playerPos(page)).x;
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowLeft');
  expect((await playerPos(page)).x).toBeCloseTo(before, 0);

  await page.keyboard.press('e'); // buy the highlighted garland
  await expect.poll(async () => (await state(page)).inventory).toEqual({ 'jasmine-garland': 1 });
  expect((await state(page)).money).toBe(30);
  await page.keyboard.press('Escape');
  await expect.poll(() => shop(page)).toBeNull();

  await page.keyboard.press('i');
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.inventoryOpen())).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.inventoryOpen())).toBe(false);

  await goTo(page, NEAR_PIM, 'pim');
  await page.keyboard.press('e');
  await expect.poll(async () => (await dialogueState(page))?.text.th ?? '').toMatch(/พวงมาลัยมะลิ/);
  await pressUntilClosed(page);
  expect(await questLog(page)).toEqual({ 'pims-garland': { status: 'completed' } });
  const after = await state(page);
  expect(after.inventory).toEqual({});
  expect(after.money).toBe(30 + 30); // reward
});

test('touch: shop and bag work with taps', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input');
  await openGame(page);
  await goTo(page, NEAR_DAENG, 'daeng');

  const talk = await page.evaluate(() => window.__LIFE_SHIFT__!.interactButton()!);
  await page.touchscreen.tap(talk.x, talk.y);
  await expect.poll(async () => (await controls(page)).dialogueChoices.length).toBe(2);
  const [browse] = (await controls(page)).dialogueChoices;
  await page.touchscreen.tap(browse!.x, browse!.y);
  await expect.poll(async () => (await controls(page)).shop?.rows.length).toBe(3);

  // Tapping a row only selects it; the Buy button buys.
  const tea = (await controls(page)).shop!.rows[1]!;
  await page.touchscreen.tap(tea.x, tea.y);
  await expect.poll(async () => (await shop(page))?.selected).toBe(1);
  expect((await state(page)).inventory).toEqual({});
  const [buy, close] = (await controls(page)).shop!.buttons;
  await page.touchscreen.tap(buy!.x, buy!.y);
  await expect.poll(async () => (await state(page)).inventory).toEqual({ 'thai-iced-tea': 1 });
  await page.touchscreen.tap(close!.x, close!.y);
  await expect.poll(() => shop(page)).toBeNull();

  const bag = (await controls(page)).bagButton;
  await page.touchscreen.tap(bag.x, bag.y);
  await expect.poll(async () => (await controls(page)).bag?.rows.length).toBe(1);
  const [closeBag] = (await controls(page)).bag!.buttons;
  await page.touchscreen.tap(closeBag!.x, closeBag!.y);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.inventoryOpen())).toBe(false);
});
