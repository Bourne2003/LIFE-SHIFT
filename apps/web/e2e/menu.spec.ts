import { expect, test, type Page } from '@playwright/test';
import { dialogueState, openGame, questLog, teleport } from './helpers';

const api = {
  paused: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.paused()),
  env: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.environment()),
  controls: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.controls()),
  state: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.state()),
  shop: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.shop()),
};

async function press(page: Page, isMobile: boolean, at: { x: number; y: number }) {
  if (isMobile) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
}

test('the menu pauses the game and resumes it', async ({ page, isMobile }) => {
  await openGame(page);
  await press(page, isMobile, (await api.controls(page)).menuButton);
  await expect.poll(() => api.paused(page)).toBe(true);
  const frozen = (await api.env(page)).minute;
  await page.waitForTimeout(1500);
  expect((await api.env(page)).minute).toBe(frozen);

  const [resume] = (await api.controls(page)).pause!.buttons;
  await press(page, isMobile, resume!);
  await expect.poll(() => api.paused(page)).toBe(false);
});

test('Esc opens and closes the pause menu', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await openGame(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => api.paused(page)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => api.paused(page)).toBe(false);
});

test('New game erases progress only after confirming', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses the keyboard to make progress first');
  await openGame(page);
  // Make some progress: accept Mina's quest.
  await teleport(page, { x: 592, y: 320 });
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc())).toBe('mina');
  await page.keyboard.press('e');
  await expect.poll(() => dialogueState(page)).not.toBeNull();
  while (await dialogueState(page)) {
    await page.keyboard.press('e');
    await page.waitForTimeout(50);
  }
  expect(Object.keys(await questLog(page))).toEqual(['minas-recipe']);

  await page.keyboard.press('Escape');
  const [, newGame] = (await api.controls(page)).pause!.buttons;
  await press(page, false, newGame!);
  // Cancel keeps everything.
  await expect.poll(async () => (await api.controls(page)).pause?.buttons.length).toBe(2);
  const [, cancel] = (await api.controls(page)).pause!.buttons;
  await press(page, false, cancel!);
  await page.keyboard.press('Escape');
  await expect.poll(() => api.paused(page)).toBe(false);
  expect(Object.keys(await questLog(page))).toEqual(['minas-recipe']);

  // Confirming starts over (the page reloads with no save).
  await page.keyboard.press('Escape');
  await press(page, false, (await api.controls(page)).pause!.buttons[1]!);
  const [confirm] = (await api.controls(page)).pause!.buttons;
  await Promise.all([page.waitForEvent('load'), press(page, false, confirm!)]);
  await openGame(page);
  expect(await questLog(page)).toEqual({});
  expect((await api.env(page)).day).toBe(1);
  expect((await api.state(page)).money).toBe(50);
});

test('items can be sold back to the shop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await openGame(page);
  await teleport(page, { x: 1040, y: 352 });
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc())).toBe('daeng');
  await page.keyboard.press('e');
  await expect.poll(async () => (await dialogueState(page))?.choices.length).toBe(2);
  await page.keyboard.press('e');
  await expect.poll(() => api.shop(page)).not.toBeNull();

  await page.keyboard.press('ArrowDown'); // Thai iced tea, ฿15
  await page.keyboard.press('e');
  await expect.poll(async () => (await api.state(page)).money).toBe(35);
  await page.keyboard.press('Tab'); // switch to selling
  await expect.poll(async () => (await api.shop(page))?.mode).toBe('sell');
  await page.keyboard.press('e');
  await expect.poll(async () => (await api.state(page)).money).toBe(35 + 7);
  expect((await api.state(page)).inventory).toEqual({});
});
