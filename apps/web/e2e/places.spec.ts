import { expect, test, type Page } from '@playwright/test';
import { dialogueState, openGame, playerPos, questLog, teleport } from './helpers';

const NEAR = {
  ton: { x: 528, y: 384 }, // below Ton (feet 528, 352)
  cat: { x: 1232, y: 928 }, // below Som in the alley (feet 1232, 896)
  boon: { x: 1008, y: 864 }, // below Grandma Boon (feet 1008, 832)
  chai: { x: 880, y: 608 }, // below Uncle Chai (feet 880, 576)
  daeng: { x: 1040, y: 352 },
};

const api = {
  nearby: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc()),
  location: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.location()),
  state: (p: Page) => p.evaluate(() => window.__LIFE_SHIFT__!.state()),
  present: (p: Page, id: string) =>
    p.evaluate((id) => window.__LIFE_SHIFT__!.npcs().find((n) => n.id === id)!.present, id),
  setClock: (p: Page, day: number, minute: number) =>
    p.evaluate(([d, m]) => window.__LIFE_SHIFT__!.setClock(d!, m!), [day, minute]),
};

/** Stands next to an NPC and talks until the conversation ends (first choice each time). */
async function talkTo(page: Page, spot: { x: number; y: number }, npc: string) {
  await teleport(page, spot);
  await expect.poll(() => api.nearby(page)).toBe(npc);
  await page.keyboard.press('e');
  await expect.poll(() => dialogueState(page)).not.toBeNull();
  while (await dialogueState(page)) {
    await page.keyboard.press('e');
    await page.waitForTimeout(50);
  }
}

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'drives dialogue with the keyboard');
});

test('the hidden alley is walled off, reachable only through its gap', async ({ page }) => {
  await openGame(page);
  // Walking east along row 27 runs into the alley wall.
  await teleport(page, { x: 1090, y: 880 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowRight');
  expect((await playerPos(page)).body.right).toBeCloseTo(35 * 32, 0);
  expect(await api.location(page)).toBeNull();

  // Along the bottom row there is a way in.
  await teleport(page, { x: 1090, y: 956 });
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => api.location(page)).toBe('hidden-alley');
  await page.keyboard.up('ArrowRight');
  expect((await api.state(page)).flags['visited:hidden-alley']).toBe(true);
});

test('The Lost Cat: Som goes home after being found', async ({ page }) => {
  await openGame(page);
  await talkTo(page, NEAR.ton, 'ton');
  expect(await questLog(page)).toMatchObject({ 'lost-cat': { status: 'active', step: 'find' } });

  await talkTo(page, NEAR.cat, 'som-alley');
  expect(await api.present(page, 'som-alley')).toBe(false);

  await talkTo(page, NEAR.ton, 'ton');
  expect(await questLog(page)).toMatchObject({ 'lost-cat': { status: 'completed' } });
  expect(await api.present(page, 'som-home')).toBe(true);
});

test("Grandma Boon's curry is only accepted after dark", async ({ page }) => {
  await openGame(page);
  await talkTo(page, NEAR.boon, 'boon');
  expect((await api.state(page)).inventory).toEqual({ 'green-curry': 1 });

  await talkTo(page, NEAR.chai, 'chai'); // morning: "bring it this evening"
  expect((await api.state(page)).inventory).toEqual({ 'green-curry': 1 });

  await api.setClock(page, 1, 19 * 60);
  await talkTo(page, NEAR.chai, 'chai');
  expect(await questLog(page)).toMatchObject({ 'boons-curry': { status: 'completed' } });
});

test('The Stopped Clock: oil from the shop makes the tower run again', async ({ page }) => {
  await openGame(page);
  await talkTo(page, NEAR.chai, 'chai');

  await teleport(page, NEAR.daeng);
  await expect.poll(() => api.nearby(page)).toBe('daeng');
  await page.keyboard.press('e');
  await expect.poll(async () => (await dialogueState(page))?.choices.length).toBe(2);
  await page.keyboard.press('e'); // open the shop
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.shop())).not.toBeNull();
  await page.keyboard.press('ArrowUp'); // wraps to the last entry: machine oil
  await page.keyboard.press('e');
  await expect.poll(async () => (await api.state(page)).inventory).toEqual({ 'machine-oil': 1 });
  await page.keyboard.press('Escape');

  await talkTo(page, NEAR.chai, 'chai');
  expect(await questLog(page)).toMatchObject({ 'stopped-clock': { status: 'completed' } });
  await expect
    .poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.props()))
    .toContain('clock-tower-face');
});
